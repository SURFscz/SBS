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

SBS_HOST = os.environ.get("SBS_HOST", "https://sbs.example.com")
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

	s = "{}{}:{}".format(LDAP_PROT, LDAP_HOST, LDAP_PORT)

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

def ldap_collobarations():
	l = ldap_session.search_s(f"{LDAP_BASE}", ldap.SCOPE_ONELEVEL, f"(&(objectclass=organization)(o=*))")
	log_ldap_result(l)
	return l

def ldap_people(base):
	l = ldap_session.search_s(f"ou=People,{base}", ldap.SCOPE_ONELEVEL, f"(&(objectclass=organizationalPerson)(uid=*))")
	log_ldap_result(l)
	return l

attributes_dependencies = {'labeledURI': 'labeledURIObject' }

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

		if k == 'labeledURI':
			ldap_attribute_value(result, 'objectClass', 'labeledURIObject')
		if k == 'sshPublicKey':
			ldap_attribute_value(result, 'objectClass', 'ldapPublicKey')

		ldap_attribute_value(result, k, v)

	log_info(f"ATTRIBUTES {result}")

	return result

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

def api(url, method='GET', headers=None, data=None):

	log_debug(f"REQUESTING: {url}")
	r = requests.request(method, url=url, headers=headers, auth=HTTPBasicAuth(API_USER, API_PASS), data=data)

	log_debug('\n'.join(f'{k}: {v}' for k, v in r.headers.items()))

	if r.status_code == 200:
		try:
			return get_json(r.text)
		except:
			log_info(r.text)
			return r.text
	else:
		log_error(f"API: {url} returns: {r.status_code}")

	return None


health = api(SBS_HOST+"/health")
if not health or health['status'] != "UP":
	panic("Server is not UP !")

api(SBS_HOST+"/api/users/me")

organisations = api(SBS_HOST+"/api/organisations/all")

co_users = {}

def get_organisation(org_id):
	for o in organisations:
		if o['id'] == org_id:
			return o

	panic(f"Organisation {id} not found !")

collaborations = api(SBS_HOST+"/api/collaborations/all")
for c in collaborations:
	org = get_organisation(c['organisation_id'])

	c['organisation_details'] = org

	log_debug(f"CO name: {c['name']}, description: {c['description']}")

	co_users[c['name']] = {}

	extra = {}

	details = api(SBS_HOST+f"/api/collaborations/{c['id']}")

	for m in details['collaboration_memberships']:
		log_debug(f"- CO member [{m['role']}]")

		co_users[c['name']][m["user_id"]] = {}

		co_users[c['name']][m["user_id"]]["user"] = m["user"]
		co_users[c['name']][m["user_id"]]["roles"] = [ f"CO:{c['name']}", "GRP:CO:members:all", "GRP:CO:members:active" ]

		if m['role'] == 'admin':
			co_users[c['name']][m["user_id"]]["roles"].append("GRP:CO:admins")

	for a in details['authorisation_groups']:
		log_debug(f"- AUTH GROUP [{a['name']}]")

		auth_group = api(SBS_HOST+f"/api/authorisation_groups/{a['id']}/{c['id']}")

		for m in auth_group['collaboration_memberships']:

			co_users[c['name']][m["user_id"]]["roles"].extend(
				[ f"GRP:{a['name']}" ]
			)

			if m['role'] == 'admin':
				co_users[c['name']][m["user_id"]]["roles"].append(f"GRP:{a['name']}:admins")

	for s in details['services']:
		log_debug(f"- SERVICE [{s['name']}]")

		if 'labeledURI' not in extra:
			extra['labeledURI'] = []

		extra['labeledURI'].append(s['entity_id'])

	# Mark this LDAP entry as hosted by SBS_HOST...
	extra['host'] = SBS_HOST

	# Make the CO...
	ldap_org('CO', f"{LDAP_BASE}", c['name'], json.dumps(c), **extra)

	# Add the People to it...
	for i in co_users[c['name']].keys():
		u = co_users[c['name']][i]

		ldap_member('CO',
			c['name'],
			base = f"o={c['name']},{LDAP_BASE}",
			roles = u['roles'],
			uid = u["user"]["uid"],
			cn = u["user"]["name"],
			sn = u["user"]["family_name"],
			mail = u["user"]["email"],
			displayName = u["user"]["name"],
			givenName = u["user"]["given_name"]
		)

# Cleanup redundant objects...

log_info("Cleanup phase...")
for co in ldap_collobarations():

	if co[0].startswith("ou=People,") or co[0].startswith("ou=Groups,"):
		continue

	# we are only interested in entries that are maintained by 'me'...
    if 'host' not in co[1] or co[1]['host'] != SBS_HOST:
        continue

	log_debug(f"CHECK CO: {co[0]}...")
	co_validated = False

	for c in collaborations:

		if f"{co[0]}" == f"o={c['name']},{LDAP_BASE}":
			co_validated = True

			log_debug(f"CHECK CO: {co[0]} VALIDATED !")

			for m in ldap_people(f"o={c['name']},{LDAP_BASE}"):
				uid = m[1]['uid'][0].decode()

				log_debug(f"CHECK CO PERSON: {uid}...")
				person_validated = False

				for u in co_users[c['name']]:
					if co_users[c['name']][u]["user"]['uid'] == uid:
						person_validated = True
						break

				if person_validated:
					log_debug(f"CHECK CO PERSON: {uid} VALIDATED !")
				else:
					ldap_delete("P", uid, m[0])

			break

	if not co_validated:
		ldap_delete("CO", co[0].split(',')[0].split('=')[1], co[0])
#		log_info(f"SHOULD DELETE, {co[0]} but not now !")

ldap_session.unbind_s()

flush_notifications()

log_info("Done !")

exit(0)
