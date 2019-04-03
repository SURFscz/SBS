#!/usr/bin/env pythion3

import os
import sys
import json
import requests
import datetime
import uuid

from copy import deepcopy
from http.cookies import SimpleCookie
from requests.cookies import cookiejar_from_dict
from requests import Session
from requests.auth import HTTPBasicAuth

from colorama import Fore, Back, Style

# CONSTANTS

SBS_HOST = os.environ.get("SBS_HOST", "https://sbs.exp.scz.lab.surf.nl")
PUBLISHER_PORT = os.environ.get("PUBLISHER_PORT", "5556")

BASE_DN = os.environ.get("BASE_DN", "ou=sbs,dc=example,dc=org")

LDAP_HOST = os.environ.get("LDAP_HOST", "ldap.exp.scz.lab.surf.nl")
LDAP_USERNAME = os.environ.get("LDAP_USERNAME", "cn=admin")
LDAP_PASSWORD = os.environ.get("LDAP_PASSWORD", None)

API_USER = os.environ.get("API_USER", "sysadmin")
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

def push_notification(topic, id):
	global notifications

	if not notifications:
		notifications = {}
		
	if topic not in notifications:
		notifications[topic] = []

	if id not in notifications[topic]:
		notifications[topic].append(id)

def flush_notifications():
	global notifications
	
	if not notifications:
		return

	for topic in notifications:
		for id in notifications[topic]:
			log_debug(f"Notifying: {topic}:{id}")
			publisher.send(f"{topic}:{id}".encode())

	notifications = None

# LDAP - part

import ldap
import ldap.modlist as modlist

ldap_session = None

try:
	ldap_session = ldap.initialize(f"ldaps://{LDAP_HOST}")
	ldap_session.bind_s(LDAP_USERNAME, LDAP_PASSWORD)
except:
	ldap_session.unbind_s()
	panic("LDAP connection failed !")

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

def ldap_organisations():
	l = ldap_session.search_s(BASE_DN, ldap.SCOPE_ONELEVEL, f"(&(objectclass=organizationalUnit)(ou=*))")
	log_ldap_result(l)
	return l

def ldap_collobarations(org):
	l = ldap_session.search_s(f"ou={org},{BASE_DN}", ldap.SCOPE_ONELEVEL, f"(&(objectclass=organizationalUnit)(ou=*))")
	log_ldap_result(l)
	return l

def ldap_people(base):
	l = ldap_session.search_s(f"ou=people,{base}", ldap.SCOPE_ONELEVEL, f"(&(objectclass=organizationalPerson)(cn=*))")
	log_ldap_result(l)
	return l
 
def ldap_ou(topic, base, ou, name, description):

	log_debug(f"[LDAP_OU]\n\tBase: {base}\n\tOU: {ou}\n\tNAME: {name}\n\tDESCRIPTION: {description}")

	result = ldap_session.search_s(base, ldap.SCOPE_ONELEVEL, f"(&(objectclass=organizationalUnit)(ou={ou}))")
	if len(result) > 1:
		panic(f"Expected max 1 object, found: {result}")

	log_ldap_result(result)

	attrs = {}
	attrs['objectClass'] = [b'top', b'organizationalUnit', b'extensibleObject']
	attrs['ou'] = [ou.encode()]
	attrs['name'] = [name.encode()]
	attrs['description'] = [description.encode()]

	dn = f"ou={ou},{base}"
	if len(result) == 0:
		ldif = modlist.addModlist(attrs)

		try:
			ldap_session.add_s(dn, ldif)
			ldap_session.add_s(f"ou=people,ou={ou},{base}" , ldif)
			ldap_session.add_s(f"ou=groups,ou={ou},{base}" , ldif)
		except Exception as e:
			panic(f"Error during LDAP ADD OU\n\tDN={dn}\n\tLDIF={ldif}\n\tERROR: {str(e)}")

		push_notification(topic, ou)

	elif not ldap_attributes_equal(attrs, result[0][1]):
		ldif = modlist.modifyModlist(result[0][1], attrs)

		try:
			ldap_session.modify_s(dn, ldif)
		except Exception as e:
			panic(f"Error during LDAP MODIFY OU\n\tDN={dn}\n\tLDIF={ldif}\n\tERROR: {str(e)}")

		push_notification(topic, ou)

def ldap_member(topic, id, base, role, uid, **kwargs):

	log_debug(f"[LDAP_MEMBER]\n\tBase: {base}\n\tROLE: {role}\n\tUID: {uid}")

	result = ldap_session.search_s(f"ou=people,{base}", ldap.SCOPE_ONELEVEL, f"(&(objectclass=organizationalPerson)(cn={uid}))")
	if len(result) > 1:
		panic(f"Expected max 1 object, found: {result}")

	log_ldap_result(result)

	attrs = {}
	attrs['objectClass'] = [b'top', b'organizationalPerson', b'inetOrgPerson']
	attrs['cn'] = [ uid.encode() ]
	for attr, value in kwargs.items():
		if value:
			attrs[attr] = [ value.encode() ]

	log_debug(f"ATTRS: {attrs}")

	dn = f"cn={uid},ou=people,{base}"

	if len(result) == 0:
		ldif = modlist.addModlist(attrs)

		try:
			ldap_session.add_s(dn, ldif)

		except Exception as e:
			panic(f"Error during LDAP ADD MEMBER\n\tDN={dn}\n\tLDIF={ldif}\n\tERROR: {str(e)}")

		push_notification(topic, id)

	elif not ldap_attributes_equal(attrs, result[0][1]):
		ldif = modlist.modifyModlist(result[0][1], attrs)

		try:
			ldap_session.modify_s(dn, ldif)
		except Exception as e:
			panic(f"Error during LDAP MODIFY MEMBER\n\tDN={dn}\n\tLDIF={ldif}\n\tERROR: {str(e)}")

		push_notification(topic, id)

	result = ldap_session.search_s(f"ou=groups,{base}", ldap.SCOPE_ONELEVEL, f"(cn={role})")
	log_ldap_result(result)

	if len(result) > 0:
		log_debug("MEMBER DATA: " + str(result[0][1]))
		if 'member' in result[0][1]:
			log_debug("MEMBERS UIDs: " + str(result[0][1]['member']))

	if len(result) == 0 or 'member' not in result[0][1]:

		attrs = {}
		attrs['objectclass'] = [ b'groupOfNames']
		attrs['member'] = [ f"cn={uid},ou=people,{base}".encode() ]

		ldif = modlist.addModlist(attrs)
		try:
			ldap_session.add_s(f"cn={role},ou=groups,{base}", ldif)
		except Exception as e:
			panic(f"Error during LDAP ADD, Error: {str(e)}")

		push_notification(topic, id)

	elif f"cn={uid},ou=people,{base}".encode() not in result[0][1]['member']:

		attrs = deepcopy(result[0][1])
		attrs['member'].append(f"cn={uid},ou=people,{base}".encode())

		log_debug("OLD: "+str(result[0][1]))
		log_debug("NEW: "+str(attrs))

		ldif = modlist.modifyModlist(result[0][1], attrs)
		try:
			ldap_session.modify_s(f"cn={role},ou=groups,{base}", ldif)
		except Exception as e:
			panic(f"Error during LDAP ADD, Error: {str(e)}")

		push_notification(topic, id)

def ldap_delete_recursive(dn):
	log_debug(f"... DELETING DN {dn} ...")
	for i in ldap_session.search_s(dn, ldap.SCOPE_ONELEVEL, f"(objectclass=*)"):
		ldap_delete_recursive(i[0])

	ldap_session.delete_s(dn)

def ldap_delete(topic, id, dn):
	log_debug(f"LDAP DELETE {topic}:{id}, DN: {dn}")

	push_notification(topic, id)
	
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
for o in organisations:

	log_debug(f"org: [{o['id']}]: {o['name']}, description: {o['description']}, tenant: {o['tenant_identifier']} ")

	ldap_ou('O', BASE_DN, o['tenant_identifier'], o['name'], o['description'])

	org = api(SBS_HOST+f"/api/organisations/{o['id']}")
	o['members'] = deepcopy(org['organisation_memberships'])

	for m in o['members']:
		log_debug(f"- member [{m['role']}]: {m['user']['uid']}")

		ldap_member('O', o['tenant_identifier'],
			base = f"ou={o['tenant_identifier']},{BASE_DN}",
			role = m['role'],
			uid = m['user']['uid'],
 			displayName = m['user']['name'],
			mail = m['user']['email'],
			sn = m['user']['name'],
 			givenName = m['user']['given_name'],
		)

co_users = {}

def get_organisation(id):
	for o in organisations:
		if o['id'] == id:
			return o

	panic(f"Organisation {id} not found !")

collaborations = api(SBS_HOST+"/api/collaborations/all")
for c in collaborations:
	org = get_organisation(c['organisation_id'])

	log_debug(f"CO [{c['identifier']}]: {c['name']}, description: {c['description']}")

	ldap_ou('CO', f"ou={org['tenant_identifier']},{BASE_DN}", c['identifier'], c['name'], c['description'])

	co_users[c['identifier']] = {}

	details = api(SBS_HOST+f"/api/collaborations/{c['id']}")

	for m in details['collaboration_memberships']:
		log_debug(f"- CO member [{m['role']}]")

		co_users[c['identifier']][m["user_id"]] = m["user"]

		ldap_member('CO',
			c['identifier'],
			base = f"ou={c['identifier']},ou={org['tenant_identifier']},{BASE_DN}",
			role = m['role'],
			uid = m["user"]["uid"],
			sn = m["user"]["name"],
			mail = m["user"]["email"],
			displayName = m["user"]["name"],
			givenName = m["user"]["given_name"]
		)

# Cleanup redundant objects...

for org in ldap_organisations():

	if org[0].startswith("ou=people,") or org[0].startswith("ou=groups,"):
		continue

	log_debug(f"CHECK O: {org[0]}...")
	org_validated = False

	for o in organisations:
		if org[0] == f"ou={o['tenant_identifier']},{BASE_DN}":

			org_validated = True

			for co in ldap_collobarations(o['tenant_identifier']):

				if co[0].startswith("ou=people,") or co[0].startswith("ou=groups,"):
					continue

				log_debug(f"CHECK CO: {co[0]}...")
				co_validated = False
			
				for c in collaborations:
					if co[0] == f"ou={c['identifier']},ou={o['tenant_identifier']},{BASE_DN}":
						co_validated = True

						log_debug(f"CHECK CO: {co[0]} VALIDATED !")

						for m in ldap_people(f"ou={c['identifier']},ou={o['tenant_identifier']},{BASE_DN}"):
							cn = m[1]['cn'][0].decode()

							log_debug(f"CHECK CO PERSON: {cn}...")
							person_validated = False

							for u in co_users[c['identifier']]:
								if co_users[c['identifier']][u]['uid'] == cn:
									person_validated = True
									break

							if person_validated:
								log_debug(f"CHECK CO PERSON: {cn} VALIDATED !")
							else:
								ldap_delete("P", cn, m[0])

						break

				if not co_validated:
					# CO not found, remove it
					ldap_delete("CO", co[0].split(',')[0].split('=')[1], co[0])

			log_debug(f"CHECK O: {org[0]} VALIDATED !")

			for m in ldap_people(f"ou={o['tenant_identifier']},{BASE_DN}"):
				cn = m[1]['cn'][0].decode()

				log_debug(f"CHECK ORG PERSON: {cn}...")
				person_validated = False

				for om in o['members']:
					if om['user']['uid'] == cn:
						person_validated = True
						break

				if person_validated:
					log_debug(f"CHECK ORG PERSON: {cn} VALIDATED !")
				else:
					ldap_delete("P", cn, m[0])

			break

	if not org_validated:
		# Org not found, remove it !
		ldap_delete("O", org[0].split(',')[0].split('=')[1], org[0])

def adjust_acl(config):
    log_info("Willing to adjust ACL...")

    # log_debug(f"CONFIG: {config[0][1]['olcAccess']}")

    n = 0
    for i in config[0][1]['olcAccess']:
        log_info(f"{i.decode()}")
        n = n + 1

    for o in organisations:
        log_info(f"{{{n}}}to dn.subtree=\"ou={o['tenant_identifier']},{BASE_DN}\" \
            by group=\"cn=admin,ou=groups,ou={o['tenant_identifier']},{BASE_DN}\" read by * break")

        n = n + 1

try:
    adjust_acl(ldap_session.search_s("olcDatabase={0}config,cn=config", ldap.SCOPE_SUBTREE, f"(objectclass=*)"))
except:
    log_info("Skiking ACL modifications")

ldap_session.unbind_s()

flush_notifications()

log_info("Done !")

exit(0)
