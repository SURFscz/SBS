#!/usr/bin/env python3

import re
from os import PathLike
from pathlib import Path
#from pprint import pprint
from typing import List, Set, Optional


DEBUG = True

if DEBUG:
    debug = print
else:
    def debug(_):
        pass


def find_template_in_file(filename: PathLike) -> List[str]:
    debug(f"Reading {filename}")
    with open(filename, 'r') as f:
        content = f.read().replace('\n', '')

    i18t_pattern = re.compile(r'I18n\.t\("(.*?)"')
    return [match[1] for match in i18t_pattern.finditer(content)]


def find_used_templates(client_dir: PathLike = Path(".")) -> Set[str]:
    paths = Path(client_dir).glob("client/src/**/*")
    extensions = ('jsx', 'scss')

    used_templates: Set[str] = set()
    for path in paths:
        if path.is_file() and any([path.match(f"*.{ex}") for ex in extensions]):
            used_templates |= set(find_template_in_file(path))

    return used_templates


def find_translations(language: str, client_dir: PathLike = Path(".")) -> List[str]:
    path = Path(client_dir) / "client/src/locale" / f"{language}.js"

    translations: List[str] = []

    # look for next {, } or , (but NOT {{ or }})
    # TODO: check for lists ([a,b,c,..])
    regexp = re.compile('''
            ,  # comma is simple
            | (?<!{) { (?!{)  # match a single {, but not x{{ or {{x: negative lookbehind {, {, negative lookahead {
            | (?<!}) } (?!})
            ''', re.X)
    regexp = re.compile(r'[,{}]')

    content = path.read_text(encoding='UTF-8')
    parents = []

    # start parsing at the first {
    content = content.partition('{')[2]

    # now loop through te datastructure, splitting on commas and curlies
    while True:
        sep = ''
        token = ''
        match: Optional[re.Match] = None
        for match in regexp.finditer(content):
            if match is None:
                raise Exception(f"Unexpected end of input! parents={parents}")

            token = content[0:match.start()].rstrip().lstrip()
            sep = match[0]
            #print(f"->> '{sep}' : '{token}'")

            # check that token has an even number of quotation marks
            # if not, we have detected a [,{}] in th middle of a string
            # if that happens, just continue search for ,{} until we find a correct one
            if token.count('"') % 2 == 0:
                break

        if sep == '{':
            # going a level deeper into the tree
            (key, _, _) = token.partition(":")
            key = key.lstrip(' "').rstrip(' "')
            # save the current branch so we can pop it when we encounter a }
            parents.append(key)
        elif sep == '}' or sep == ',':
            if token != '':
                (key, _, value) = token.partition(":")
                value = value.lstrip(' "').rstrip(' "')
                key = key.lstrip(' "').rstrip(' "')
                print("/" + ".".join(parents + [key]) + f"/ --> /{value}/")
            if sep == '}':
                if len(parents) == 0:
                    # stack is empty, we're done
                    break
                parents.pop()
        else:
            raise Exception("Cannot happen")

        content = content[match.end():].lstrip()

    return translations


def main():
    #used_templates = find_used_templates()
    #debug("These templates are used in the client:")
    #debug(used_templates)

    find_translations('nl')


if __name__ == "__main__":
    main()
