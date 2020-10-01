let switchFlag = true;
let dictionary = {};
const dictionaryPath = "pl_only_dict.json";
let workingDictionary = {};
const wordRegex = /^[a-ząęłóźż]+$/i; //case-insensitive

const fuzzysetJS = document.createElement("script");
fuzzysetJS.src += (chrome || browser).extension.getURL("fuzzyset.js");

(document.head || document.documentElement).appendChild(fuzzysetJS);

const plSubstitutions = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ż: "z",
  ź: "x",
};

const plRegex = new RegExp(Object.keys(plSubstitutions).join("|"), "gi");

function initDictionaries() {
  readWorkingDictionary((res) => {
    workingDictionary = JSON.parse(res.workingDictionaryKey);
  });
  readDictionary();
}

function readWorkingDictionary(callback) {
  (chrome || browser).storage.local.get(
    { workingDictionaryKey: "{}" },
    (res) => {
      callback(res);
    }
  );
}

function readDictionary(onComplete) {
  const startTime = performance.now();
  console.log("Reading dictionary...");

  const req = new XMLHttpRequest();
  req.open("GET", (chrome || browser).extension.getURL(dictionaryPath), true);
  req.onreadystatechange = function () {
    if (req.readyState === XMLHttpRequest.DONE && req.status === 200) {
      dictionary = JSON.parse(req.responseText);

      const endTime = performance.now();
      console.log(
        "Done reading dictionary. Total words loaded: " +
          Object.keys(dictionary).length +
          " Time spent: " +
          (endTime - startTime) +
          " milliseconds."
      );

      if (onComplete !== undefined) {
        onComplete();
      }
    }
  };
  req.send();
}

function getSuggestedResolutions(word) {
  if (workingDictionary[word] !== undefined) {
    console.log("Word " + word + " found in working dictionary");
    resultList = [];
    if (workingDictionary[word].indexOf("/") > -1) {
      str = workingDictionary[word].split("/");
    } else {
      str = workingDictionary[word];
    }

    for (let element of str) {
      resultList.push(element);
    }

    toReturn = [];
    for (let element of resultList) {
      toReturn.push({ word: element, distance: 0 });
    }
    return toReturn;
  } else if (word.match(wordRegex)) {
    const resultList = [];

    const nonPlWord = word.replace(
      plRegex,
      (matched) => plSubstitutions[matched.toLowerCase()]
    );
    const suggestionsList = dictionary[nonPlWord];

    if (suggestionsList != null && !suggestionsList.includes(word)) {
      fuzzyset = FuzzySet(suggestionsList);
      matches = fuzzyset.get(word);
      console.log(matches);
      for (let element of matches) {
        resultList.push({
          word: element[1],
          distance: element[0],
        });
      }
    }

    return resultList;
  } else {
    return [];
  }
}

function addToDictionary(toReplace, replacement) {
  console.log(
    "Adding new replacement scheme to working dictionary: (" +
      toReplace +
      " -> " +
      replacement +
      ")"
  );
  if (
    isWordCorrectWithAlert(toReplace) &&
    isWordCorrectWithAlert(replacement)
  ) {
    if (workingDictionary[toReplace] == undefined)
      workingDictionary[toReplace] = [replacement];
    else
      workingDictionary[toReplace] =
        workingDictionary[toReplace] + "/" + [replacement];
  }
  updateSerializedDictionary();
}

function updateSerializedDictionary() {
  (chrome || browser).storage.local.set({
    workingDictionaryKey: JSON.stringify(workingDictionary),
  });
}

function isWordCorrectWithAlert(word) {
  if (wordRegex.test(word)) {
    return true;
  } else {
    console.log('Attempted to add incorrect word: "' + word + '"');
    alert(
      'Niepoprawne słowo: "' + word + '". Słowo może składać się tylko z liter!'
    );
    return false;
  }
}

function deleteMapping(word) {
  delete workingDictionary[word];
  updateSerializedDictionary();
}

(chrome || browser).runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    switch (request.type) {
      case "newWordDetected":
        console.log('Calculating words closest to "' + request.query + '"');
        const resultList = getSuggestedResolutions(request.query);
        sendResponse({ resultList: resultList });
        break;
      case "newWordsForWorkingDictionary":
        addToDictionary(request.toReplace, request.replacement);
        break;
      case "switchState":
        switchFlag = request.state;
        (chrome || browser).tabs.query({ active: true }, function (tabs) {
          (chrome || browser).tabs.sendMessage(
            tabs[0].id,
            {
              action: "switchState",
              flag: switchFlag,
            },
            function (response) {}
          );
        });
        break;
      case "getSwitchState":
        (chrome || browser).tabs.query({ active: true }, function (tabs) {
          (chrome || browser).tabs.sendMessage(
            tabs[0].id,
            {
              action: "switchState",
              flag: switchFlag,
            },
            function (response) {}
          );
        });
        break;
      case "getPopupState":
        sendResponse({ state: switchFlag });
        break;
      case "updateIcon":
        if (switchFlag) {
          (chrome || browser).browserAction.setIcon({
            path: "/imgs/logo_on_38.png",
          });
        } else {
          (chrome || browser).browserAction.setIcon({
            path: "/imgs/logo_off_38.png",
          });
        }
        break;
      case "getWorkingDictionary":
        readWorkingDictionary((res) => {
          sendResponse({ workingDictionary: res.workingDictionaryKey });
        });
        return true;
      case "deleteMapping":
        deleteMapping(request.word);
        break;
      default:
        console.log("unrecognized message %O", request);
    }
  }
);

(chrome || browser).contextMenus.create({
  title: "Zawsze poprawiaj na...",
  contexts: ["selection"],
  onclick: function (selection) {
    toReplace = selection.selectionText.trim();
    (chrome || browser).tabs.create(
      {
        url: (chrome || browser).extension.getURL("contextMenuPopup.html"),
        active: false,
      },
      function (tab) {
        (chrome || browser).windows.create(
          {
            tabId: tab.id,
            type: "popup",
            focused: true,
            width: 250,
            height: 150,
          },
          function (window) {
            //Think of this as a 'constructor argument' for the popup
            (chrome || browser).runtime.sendMessage({ toReplace: toReplace });
          }
        );
      }
    );
  },
});

(chrome || browser).tabs.query({ active: true }, function (tabs) {
  (chrome || browser).tabs.sendMessage(
    tabs[0].id,
    {
      action: "switchState",
      flag: switchFlag,
    },
    function (response) {}
  );
});

initDictionaries();
