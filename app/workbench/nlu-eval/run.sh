#!/bin/sh
# Runs one of the scripts here against the app's real NLU code, without a browser.
#   ./run.sh            → eval.mjs (the full report)
#   ./run.sh themes     → themes.mjs, names → names.mjs, more-phrasings → more-phrasings.mjs
# Needs node 18+. Nothing is installed: the model and the ONNX runtime are the app's own.
set -e
cd "$(dirname "$0")"
APP=../..
rm -rf .build && mkdir -p .build/services .build/utils .build/data
cp $APP/js/services/nlu.js $APP/js/services/tokenizer.js $APP/js/services/intent.js .build/services/
cp $APP/js/utils/events.js .build/utils/
cp $APP/js/data/talk.js .build/data/
# The report needs a few internals the app does not export
printf '\nexport { INTENT_EXEMPLARS, exemplarEmbeddings, MATCH_THRESHOLD };\n' >> .build/services/nlu.js
exec node "${1:-eval}.mjs"
