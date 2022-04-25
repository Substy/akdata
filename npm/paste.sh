#!/bin/sh
# NR==FNR -> for the first file, 
# print other lines
# if matches "// attributes.js", paste argv[2] here.
 
awk 'NR==FNR{ print; if ($0 ~ /\/\/ attributes.js/) { while ((getline < ARGV[2]) > 0) { print } }}' attributes.stub.js ../resources/attributes.js >attributes.js