#!/usr/bin/env python3

import os
import sys
import json
import requests
import datetime

from copy import deepcopy
from requests.auth import HTTPBasicAuth

from colorama import Fore, Style

# CONSTANTS

SBS_HOST = os.environ.get("SBS_HOST", "sbs.example.com")
SBS_PROT = os.environ.get("SBS_PROT", "https")

PUBLISHER_PORT = os.environ.get("PUBLISHER_PORT", "5556")

LDAP_PROT = os.environ.get("LDAP_PROT", "ldap://")
LDAP_HOST = os.environ.get("LDAP_HOST", "ldap")
LDAP_PORT = os.environ.get("LDAP_PORT", "389")
LDAP_BASE = os.environ.get("LDAP_BASE", "dc=example,dc=com")
LDAP_USER = os.environ.get("LDAP_USER", "cn=admin")
LDAP_PASS = os.environ.get("LDAP_PASS", None)

API_USER = os.environ.get("API_USER", "sysread")
API_PASS = os.environ.get("API_PASS", None)

def log(s):
	print(s)

def timestamp():
	return datetime.datetime.now().strftime("%d.%b %Y %H:%M:%S")

def log_error(s):
	log(Fore.RED+Style.BRIGHT+'['+timestamp()+']: '+Style.NORMAL+s+Fore.RESET)

def log_warning(s):
	log(Fore.YELLOW+s+Fore.RESET)

def log_info(s):
	log(Fore.GREEN+s+Fore.RESET)

def log_debug(s):
	log(Fore.MAGENTA+s+Fore.RESET)

def log_json(data, title=None):
	if title:
		log_info(title)
	log_info(json.dumps(data, indent=4, sort_keys=True))

def panic(s):
	log_error(s)
	sys.exit(1)

def get_json(string, title=None):
	data = json.loads(string)
	log_json(data, title)
	return data

def put_json(data, title=None):
	log_json(data, title)
	return json.dumps(data)

# 0MQ - part

import zmq

try:
	context = zmq.Context()
	publisher = context.socket(zmq.PUB)
	publisher.bind("tcp://*:%s" % PUBLISHER_PORT)
except:
	panic("Publisher cannot be started !")

notifications = None

def push_notification(topic, subject):
	global notifications

	if not notifications:
		notifications = {}

	if topic not in notifications:
		notifications[topic] = []

	if subject not in notifications[topic]:
		notifications[topic].append(subject)

def flush_notifications():
	global notifications

	if not notifications:
		return

	for topic in notifications:
		for subject in notifications[topic]:
			log_debug(f"Notifying: {topic}:{subject}")
			publisher.send(f"{topic}:{subject}".encode())

	notifications = None

# LDAP - part

import ldap
import ldap.modlist as modlist

ldap_session = None

try:
	ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_NEVER)

	s = f"{LDAP_PROT}://{LDAP_HOST}:{LDAP_PORT}"

	ldap_session = ldap.initialize(s)
	ldap_session.bind_s(LDAP_USER, LDAP_PASS)
except Exception as e:
	ldap_session.unbind_s()
	panic(f"LDAP connection failed ! {str(e)}")

def log_ldap_result(r):
	log_debug(f"[LDAP SEARCH RESULT]")

	if not r:
		log_debug("<empty>")
	elif len(r) == 0:
		log_debug("[]")
	else:
		for i in r:
			log_debug(f"\tDN:\t{i[0]}\n\tDATA:\t{i[1]}")

def ldap_attributes_equal(a, b):
	log_debug(f"NEW ATTRS {a}")
	log_debug(f"OLD ATTRS {b}")

	a_keys = set(a.keys())
	b_keys = set(b.keys())
	intersect_keys = a_keys.intersection(b_keys)
	log_debug(f"INTERSECT KEYS {intersect_keys}")

	added = a_keys - b_keys
	removed = b_keys - a_keys

	modified = {o: (a[o], b[o]) for o in intersect_keys if not (set(a[o]) & set(b[o]))}
	same = set(o for o in intersect_keys if set(a[o]) & set(b[o]))

	log_debug(f"ADDED {added}, {len(added)}")
	log_debug(f"REMOVED {removed}, {len(removed)}")
	log_debug(f"MODIFIED {modified}, {len(modified)}")
	log_debug(f"SAME {same}, {len(same)}")

	return len(added) == 0 and len(removed) == 0 and len(modified) == 0

def ldap_services():
	l = ldap_session.search_s(f"{LDAP_BASE}", ldap.SCOPE_ONELEVEL, f"(&(objectclass=dcObject)(dc=*))")
	log_ldap_result(l)
	return l

def ldap_collobarations(service):
	l = ldap_session.search_s(f"dc={service},{LDAP_BASE}", ldap.SCOPE_ONELEVEL, f"(&(objectclass=organization)(o=*))")
	log_ldap_result(l)
	return l

def ldap_people(service, collabaration):
	l = ldap_session.search_s(f"ou=People,o={collabaration},dc={service},{LDAP_BASE}", ldap.SCOPE_ONELEVEL, f"(&(objectclass=organizationalPerson)(uid=*))")
	log_ldap_result(l)
	return l

objectclass_dependencies = {
	'labeledURI': 'labeledURIObject',
	'sshPublicKey': 'ldapPublicKey'
}

def ldap_attribute_value(attributes, attr, value):
	if attr not in attributes:
		attributes[attr] = []

	if not value:
		value = 'n/a'

	if not isinstance(value, list):
		value = [ value ]

	for v in value:
		if v.encode() not in attributes[attr]:
			attributes[attr].append(v.encode())

def ldap_attributes(**kwargs):
	result = {}

	for k,v in kwargs.items():

		# Check if we need to add additional ObjectClasses...
		if k in objectclass_dependencies:
			ldap_attribute_value(result, 'objectClass', objectclass_dependencies[k])

		ldap_attribute_value(result, k, v)

	log_info(f"ATTRIBUTES {result}")

	return result

def ldap_service(base, dc):
	result = ldap_session.search_s(base, ldap.SCOPE_ONELEVEL, f"(&(objectclass=organization)(dc={dc}))")
	if len(result) == 1:
		return

	attrs = ldap_attributes(
		objectClass = ['top', 'dcObject', 'organization'],
		o = SBS_HOST
	)

	dn = f"dc={dc},{base}"
	ldif = modlist.addModlist(attrs)
	ldap_session.add_s(dn, ldif)

def ldap_org(topic, base, name, description, **kwargs):

	log_debug(f"[LDAP_OU]\n\tBase: {base}\n\tNAME: {name}\n\tDESCRIPTION: {description}")

	result = ldap_session.search_s(base, ldap.SCOPE_ONELEVEL, f"(&(objectclass=organization)(o={name}))")
	if len(result) > 1:
		panic(f"Expected max 1 object, found: {result}")

	log_ldap_result(result)

	attrs = ldap_attributes(
		objectClass = ['top', 'organization', 'extensibleObject'],
		o = name,
		description = description,
		**kwargs
	)

	dn = f"o={name},{base}"
	if len(result) == 0:
		try:
			ldif = modlist.addModlist(attrs)

			ldap_session.add_s(dn, ldif)

			ldif_children = modlist.addModlist(
					ldap_attributes(
						objectClass = ['top', 'organizationalUnit']
					)
				)

			ldap_session.add_s(f"ou=People,o={name},{base}" , ldif_children)
			ldap_session.add_s(f"ou=Groups,o={name},{base}" , ldif_children)
		except Exception as e:
			panic(f"Error during LDAP ADD OU\n\tDN={dn}\n\tLDIF={ldif}\n\tERROR: {str(e)}")

		push_notification(topic, name)

	elif not ldap_attributes_equal(attrs, result[0][1]):
		ldif = modlist.modifyModlist(result[0][1], attrs)

		try:
			ldap_session.modify_s(dn, ldif)
		except Exception as e:
			panic(f"Error during LDAP MODIFY O\n\tDN={dn}\n\tLDIF={ldif}\n\tERROR: {str(e)}")

		push_notification(topic, name)

def ldap_member(topic, subject, base, roles, uid, **kwargs):

	log_debug(f"[LDAP_MEMBER]\n\tBase: {base}\n\tROLES: {roles}\n\tUID: {uid}")

	result = ldap_session.search_s(f"ou=People,{base}", ldap.SCOPE_ONELEVEL, f"(&(objectclass=organizationalPerson)(uid={uid}))")
	if len(result) > 1:
		panic(f"Expected max 1 object, found: {result}")

	log_ldap_result(result)

	attrs = ldap_attributes(
		objectClass = ['top', 'organizationalPerson', 'inetOrgPerson'],
		uid = uid,
		**kwargs
	)

	dn = f"uid={uid},ou=People,{base}"

	if len(result) == 0:
		ldif = modlist.addModlist(attrs)

		try:
			ldap_session.add_s(dn, ldif)

		except Exception as e:
			panic(f"Error during LDAP ADD MEMBER\n\tDN={dn}\n\tLDIF={ldif}\n\tERROR: {str(e)}")

		push_notification(topic, subject)

	elif not ldap_attributes_equal(attrs, result[0][1]):
		ldif = modlist.modifyModlist(result[0][1], attrs)

		try:
			ldap_session.modify_s(dn, ldif)
		except Exception as e:
			panic(f"Error during LDAP MODIFY MEMBER\n\tDN={dn}\n\tLDIF={ldif}\n\tERROR: {str(e)}")

		push_notification(topic, subject)

	for role in roles:
		result = ldap_session.search_s(f"ou=Groups,{base}", ldap.SCOPE_ONELEVEL, f"(cn={role})")
		log_ldap_result(result)

		if len(result) > 0:
			log_debug("MEMBER DATA: " + str(result[0][1]))
			if 'member' in result[0][1]:
				log_debug("MEMBERS UIDs: " + str(result[0][1]['member']))

		if len(result) == 0 or 'member' not in result[0][1]:

			ldif = modlist.addModlist(
					ldap_attributes(
						objectClass = 'groupOfNames',
						member = f"uid={uid},ou=People,{base}",
						ou = "group" if role.startswith("GRP:") else "co",
						o = base.split(',')[0].split('=')[1]
					)
				)
			try:
				ldap_session.add_s(f"cn={role},ou=Groups,{base}", ldif)
			except Exception as e:
				panic(f"Error during LDAP ADD, Error: {str(e)}")

			push_notification(topic, subject)

		elif f"uid={uid},ou=People,{base}".encode() not in result[0][1]['member']:

			attrs = deepcopy(result[0][1])
			attrs['member'].append(f"uid={uid},ou=People,{base}".encode())

			log_debug("OLD: "+str(result[0][1]))
			log_debug("NEW: "+str(attrs))

			ldif = modlist.modifyModlist(result[0][1], attrs)
			try:
				ldap_session.modify_s(f"cn={role},ou=Groups,{base}", ldif)
			except Exception as e:
				panic(f"Error during LDAP ADD, Error: {str(e)}")

		push_notification(topic, subject)

def ldap_delete_recursive(dn):
	log_debug(f"... DELETING DN {dn} ...")
	for i in ldap_session.search_s(dn, ldap.SCOPE_ONELEVEL, f"(objectclass=*)"):
		ldap_delete_recursive(i[0])

	ldap_session.delete_s(dn)

def ldap_delete(topic, subject, dn):
	log_debug(f"LDAP DELETE {topic}:{subject}, DN: {dn}")

	push_notification(topic, subject)

	try:
		ldap_delete_recursive(dn)
	except Exception as e:
		panic(f"Error during LDAP delete DN: {dn}, Error: {str(e)}")

# API - part

def api(request, method='GET', headers=None, data=None):

	log_debug(f"API: {request} ...")
	r = requests.request(method, url=f"{SBS_PROT}://{SBS_HOST}{request}", headers=headers, auth=HTTPBasicAuth(API_USER, API_PASS), data=data)
	log_debug('\n'.join(f'{k}: {v}' for k, v in r.headers.items()))

	if r.status_code == 200:
		try:
			return get_json(r.text)
		except:
			log_info(r.text)
			return r.text
	else:
		log_error(f"API: {request} returns: {r.status_code}")

	return None

health = api("/health")
if not health or health['status'] != "UP":
	panic("Server is not UP !")

api("/api/users/me")

organisations = api("/api/organisations/all")

def get_organisation(org_id):
	for o in organisations:
		if o['id'] == org_id:
			return o

	panic(f"Organisation {id} not found !")

profile_attributes = {
	"urn:mace:dir:attribute-def:cn": "cn",
	"urn:mace:dir:attribute-def:givenName": "givenName",
	"urn:mace:dir:attribute-def:mail": "mail",
	"urn:mace:dir:attribute-def:sn": "sn",
	"urn:oid:1.3.6.1.4.1.24552.1.1.1.13": "sshPublicKey",
}

sbs_services = {}
sbs_collaborations = api("/api/collaborations/all")

for c in sbs_collaborations:
	log_debug(f"CO name: {c['name']}, description: {c['description']}")

	c['organisation'] = get_organisation(c['organisation_id'])
	c['users'] = {}
	c['extra'] = {}

	details = api(f"/api/collaborations/{c['id']}")

	for m in details['collaboration_memberships']:
		log_debug(f"- CO member [{m['role']}]")

		c['users'][m["user_id"]] = {}

		c['users'][m["user_id"]]["user"] = m["user"]
		c['users'][m["user_id"]]["roles"] = [ f"CO:{c['name']}", "GRP:CO:members:all", "GRP:CO:members:active" ]

		if m['role'] == 'admin':
			c['users'][m["user_id"]]["roles"].append("GRP:CO:admins")

	for a in details['authorisation_groups']:
		log_debug(f"- AUTH GROUP [{a['name']}]")

		auth_group = api(f"/api/authorisation_groups/{a['id']}/{c['id']}")

		for m in auth_group['collaboration_memberships']:

			c['users'][m["user_id"]]["roles"].extend(
				[ f"GRP:{a['name']}" ]
			)

			if m['role'] == 'admin':
				c['users'][m["user_id"]]["roles"].append(f"GRP:{a['name']}:admins")

	for s in details['services']:
		log_debug(f"- SERVICE [{s['name']}]")

		if s['entity_id'] not in sbs_services:
			sbs_services[s['entity_id']] = {}

		sbs_services[s['entity_id']][c['identifier']] = c

	# Mark this api( entry as hosted by SBS_HOST...
	c['extra']['host'] = SBS_HOST

for entity_id in sbs_services.keys():
	# Make the Service DC entry...
	ldap_service(f"{LDAP_BASE}", entity_id)

	for identifier, c in sbs_services[entity_id].items():

		# Make this CO as child entry for the Service DC...
		ldap_org('CO', f"dc={entity_id},{LDAP_BASE}", identifier, c['name'], **c['extra'])

		# Add the People to it...
		for i in c['users'].keys():
			u = c['users'][i]

			uid = u["user"]["uid"]

			extra = {}

			# Collect User Profile settings for the CO people using this Service....
			for s in details['services']:
				attributes = api(f"/api/user_service_profiles/attributes?service_entity_id={s['entity_id']}&uid={u['user']['uid']}")
				for k,v in profile_attributes.items():
					if k in attributes and len(attributes[k]) > 0:
						extra[v] = attributes[k]

			defaults = {
				"cn": u["user"]["name"],
				"sn": u["user"]["family_name"],
				"mail": u["user"]["email"],
				"displayName": u["user"]["name"],
				"givenName": u["user"]["given_name"]
			}

			for i in defaults.keys():
				if i not in extra:
					extra[i] = defaults[i]
				elif len(extra[i]) > 1:
					try:
						extra[i].remove(defaults[i])
					except:
						pass

			# Add the member...
			ldap_member('CO',
				c['name'],
				base = f"o={identifier},dc={entity_id},{LDAP_BASE}",
				roles = u['roles'],
				uid = uid,
				**extra
			)

# Cleanup redundant objects...

log_info("Cleanup phase...")
for dc in ldap_services():
	if 'o' not in dc[1] or dc[1]['o'][0].decode() != SBS_HOST:
		continue

	service = dc[1]['dc'][0].decode()
	service_validated = False

	log_debug(f"CHECK Service: {service}...")

	if service in sbs_services:
		service_validated = True

		log_debug(f"CHECK Service: {service} VALIDATED !")

		for o in ldap_collobarations(service):
			collaboration = o[1]['o'][0].decode()
			collaboration_validated = False

			log_debug(f"CHECK service: {service}, Collaboration: {collaboration}...")

			if collaboration in sbs_services[service]:
				collaboration_validated = True

				for m in ldap_people(service, collaboration):
					uid = m[1]['uid'][0].decode()

					log_debug(f"CHECK service: {service}, Collaboration: {collaboration}, Member: {uid}...")
					person_validated = False

					for u in sbs_services[service][collaboration]['users']:
						if sbs_services[service][collaboration]['users'][u]['user']['uid'] == uid:
							person_validated = True
							break

					if not person_validated:
						ldap_delete("P", uid, m[0])

			if not collaboration_validated:
				ldap_delete("CO", collaboration, o[0])

	if not service_validated:
		ldap_delete("SERVICE", service, dc[0])

ldap_session.unbind_s()

flush_notifications()

log_info("Done !")

exit(0)
