# coding=utf-8
import sys
import os
import io
import re
import itertools
import json
import time
import requests
import urllib.parse
from zipfile import ZipFile
from threading import Thread
from bs4 import BeautifulSoup

polish_substitutions = {
    'ą': 'a',
    'ć': 'c',
    'ę': 'e',
    'ł': 'l',
    'ń': 'n',
    'ó': 'o',
    'ś': 's',
    'ż': 'z',
    'ź': 'x'
}
polish_substitutions = dict((re.escape(k), v) for k, v in polish_substitutions.items())
pl_pattern = re.compile('|'.join(polish_substitutions.keys()))
sjp_main_link = 'https://sjp.pl/'


def is_polish_word(word):
    return re.search(r'[ąćęłńóśżź]', word)


def is_not_empty_word(word):
    return word is not ''


def split_line(line):
    return re.split(r',\s|\r\n|\n', line)


def create_dict(raw_words_file, result_json_file):
    # list of words from dictionary
    result_all_words_set = set(filter(is_not_empty_word,
                                      itertools.chain.from_iterable(map(split_line,
                                                                        raw_words_file.readlines()))))
    raw_words_file.close()
    # list of words from dictionary that have at least one polish letter
    result_pl_words_list = list(filter(is_polish_word, result_all_words_set))

    result_words_dict = {}
    # creating map with words without polish letters as keys and with polish letters as values
    # in case of a word without polish letters being a correct word it is also added to value list
    # for example: "zaba": ["żaba", "żabą"]
    # but also: "rak": ["rąk", "rak"]
    for word in result_pl_words_list:
        dict_key = pl_pattern.sub(lambda match: polish_substitutions[re.escape(match.group(0))], word)
        if dict_key in result_words_dict:
            result_words_dict[dict_key].append(word)
        else:
            result_words_dict[dict_key] = [word]
            if dict_key in result_all_words_set:
                result_words_dict[dict_key].append(dict_key)

    json.dump(result_words_dict, result_json_file)
    result_json_file.close()


def get_raw_words_file(sys_args):
    if len(sys_args) == 3:
        return io.open(sys_args[1], 'r', encoding='utf-8')
    else:
        return download_sjp_dict()


def get_result_json_file(sys_args):
    sys_args_amount = len(sys_args)

    if sys_args_amount == 3:
        result_json_path = sys_args[2]
    elif sys_args_amount == 2:
        result_json_path = sys_args[1]
    else:
        result_json_path = os.path.join(os.path.dirname(__file__), '..', 'extension', 'pl_only_dict.json')
        print('JSON dictionary will be saved to: ' + result_json_path)

    return io.open(result_json_path, 'w', encoding='utf-8')


def download_sjp_dict():
    sjp_human_dict_link = urllib.parse.urljoin(sjp_main_link, 'slownik/odmiany/')
    print('Using dictionary from: ' + sjp_human_dict_link)

    # parsing html from sjp.pl to get url where dictionary is stored
    response = requests.get(sjp_human_dict_link)
    soup = BeautifulSoup(response.content, 'html.parser')
    a_elements = soup.find_all(href=re.compile('sjp-odm-([0-9]{8,}).zip'))
    dict_link = urllib.parse.urljoin(sjp_human_dict_link, a_elements[0]['href'])

    # downloading dictionary, unzipping it, and opening as utf-8 text file
    zipped_file = ZipFile(io.BytesIO(requests.get(dict_link).content))
    return io.TextIOWrapper(zipped_file.open('odm.txt', 'r'), encoding='utf-8')


def main():
    start_time = time.perf_counter()

    if len(sys.argv) > 3:
        print('Usage: python create_pl_dict path/to/raw_dict.txt path/to/result_dict.json')
        print('   or: python create_pl_dict path/to/result_dict.json')
        print('   or: python create_pl_dict\n')
        exit(0)

    raw_words_file = get_raw_words_file(sys.argv)
    result_json_file = get_result_json_file(sys.argv)

    dict_thread = Thread(target=create_dict, args=(raw_words_file, result_json_file))
    dict_thread.start()

    print('Starting creating dictionary')
    while dict_thread.is_alive():
        elapsed_time = time.perf_counter() - start_time
        print('\rElapsed time: %10.2fs' % elapsed_time, flush=True, end='')
        time.sleep(1)
    print('\nFinished creating dictionary')


if __name__ == '__main__':
    main()
