from pathlib import Path
import urllib.request, urllib.parse, hashlib
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--output-dir',type=Path,required=True);args=parser.parse_args();p=args.output_dir;p.mkdir(parents=True,exist_ok=True)
commit="8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5"
for name in ["NotoSerifSC[wght].ttf","OFL.txt","METADATA.pb"]:
 url="https://raw.githubusercontent.com/google/fonts/"+commit+"/ofl/notoserifsc/"+urllib.parse.quote(name)
 (p/name).write_bytes(urllib.request.urlopen(url).read())
assert hashlib.sha256((p/"NotoSerifSC[wght].ttf").read_bytes()).hexdigest()=="050080d9255a86808f2945bffac582b31ef32bc36411ce29563b4961670c66f9"
(p/"source-commit.txt").write_text(commit+"\n")
