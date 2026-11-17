from pathlib import Path
import json,hashlib
import fontTools
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--source-dir',type=Path,required=True);parser.add_argument('--output-dir',type=Path,required=True);args=parser.parse_args()
p=args.output_dir;p.mkdir(parents=True,exist_ok=True);source_dir=args.source_dir
r=Path(__file__).resolve().parents[2]/'assets/scripts'
for name in ['OFL.txt','source-commit.txt']: (p/name).write_bytes((source_dir/name).read_bytes())
files=[r/'GameApp.ts']+sorted((r/'core').rglob('*.ts'))+[x for x in sorted((r/'presentation').rglob('*.ts')) if x.name!='Typeface.ts']
texts={str(x.relative_to(r)):x.read_text() for x in files}
chars={c for c in ''.join(texts.values()) if ord(c)>=32 and c.isprintable()};chars.update(chr(c) for c in range(32,127));chars.update('，。！？：；、（）【】《》“”‘’…—·％＋－×÷→←↑↓★☆')
chars.update('离线字体字样非游戏截图太初灵契青竹秘境幽冥古殿凌霄御剑诀出战战前布阵开始挑战返回灵契缔结剑雨破阵护盾恢复「」');chars=''.join(sorted(chars,key=ord));(p/'characters.txt').write_text(chars+'\n')
(p/'codepoints.txt').write_text('\n'.join(f'U+{ord(c):04X}\t{c}' for c in chars)+'\n')
source=source_dir/'NotoSerifSC[wght].ttf';assert hashlib.sha256(source.read_bytes()).hexdigest()=='050080d9255a86808f2945bffac582b31ef32bc36411ce29563b4961670c66f9','Unexpected upstream font bytes';f=TTFont(source,recalcTimestamp=False);version=f['name'].getDebugName(5);copyright=f['name'].getDebugName(0)
missing=set(map(ord,chars))-set(f.getBestCmap());assert not missing,missing
# Subset first for speed; then instantiate the remaining genuine glyf/gvar outlines at 600.
opt=subset.Options();opt.ignore_missing_unicodes=False;opt.name_IDs=['*'];opt.name_languages=['*'];opt.name_legacy=True;opt.layout_features=['*'];opt.recalc_timestamp=False
sub=subset.Subsetter(options=opt);sub.populate(text=chars);sub.subset(f);f=instantiateVariableFont(f,{'wght':600},inplace=True)
# Preserve copyright/license; rename all localized family/style/full/PS identifiers.
values={1:'TaichuUISerifSubset',2:'SemiBold',3:'TaichuUISerifSubset-600-2.003-subset1',4:'TaichuUISerifSubset SemiBold',6:'TaichuUISerifSubset-SemiBold',16:'TaichuUISerifSubset',17:'SemiBold'}
for n in f['name'].names:
 if n.nameID in values:n.string=values[n.nameID].encode(n.getEncoding())
for id,value in values.items():f['name'].setName(value,id,3,1,0x409)
f['OS/2'].usWeightClass=600
out=p/'TaichuUISerifSubset-SemiBold.ttf';f.recalcTimestamp=False;f.save(out)
f=TTFont(out);assert 'glyf' in f and 'loca' in f and 'CFF ' not in f and 'fvar' not in f;assert not (set(map(ord,chars))-set(f.getBestCmap()))
manifest={'sourceCommit':(p/'source-commit.txt').read_text().strip(),'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'sourceVersion':version,'fontCopyright':copyright,'OFLFileSHA256':hashlib.sha256((p/'OFL.txt').read_bytes()).hexdigest(),'fontTools':fontTools.__version__,'weight':600,'characterCount':len(chars),'hanCount':sum('\u3400'<=c<='\u9fff' for c in chars),'missing':[],'sourceTextHashes':{k:hashlib.sha256(v.encode()).hexdigest() for k,v in texts.items()},'outputBytes':out.stat().st_size,'outputSHA256':hashlib.sha256(out.read_bytes()).hexdigest(),'format':'static TrueType glyf/loca, no CFF/fvar','extraction':'Conservative superset of all printable source characters including comments, plus ASCII and common punctuation. No existing source Han characters removed.','reproduce':'python tools/fonts/build.py --source-dir /path/to/official-cache --output-dir /path/to/output','runtimeStatus':'Offline glyph rendering only; Creator import and game screenshot NOT tested'}
(p/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
