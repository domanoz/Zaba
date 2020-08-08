refreshPopupState = () => (chrome || browser).runtime.sendMessage({type: "getPopupState"}, (response) => {
    document.getElementById('switch').checked = response.state;
});
refreshPopupState();


document.getElementById('save').addEventListener('click', function () {
    let saveSuccessfull = false;
    //handle working dictionary
    const toReplace = document.getElementById('to-replace').value.trim();
    const replacement = document.getElementById('replacement').value.trim();
    document.getElementById('to-replace').value = '';
    document.getElementById('replacement').value = '';
    if (toReplace !== "" && replacement !== "") {
        (chrome || browser).runtime.sendMessage({
            type: "newWordsForWorkingDictionary",
            toReplace: toReplace,
            replacement: replacement
        });
        saveSuccessfull = true;
    }
    //handle empty imput
    if (!saveSuccessfull) {
        if (toReplace === "") {
            alert('Podaj, co należy poprawić!')
        } else {
            alert('Podaj, na co należy poprawić!')
        }
    }
});

document.getElementById('showWorkingDictBtn').addEventListener('click', function () {
    (chrome || browser).tabs.create({'url': (chrome || browser).extension.getURL('workingDictionary.html')});
});

document.getElementById('showMainDictBtn').addEventListener('click', function () {
    (chrome || browser).tabs.create({'url': (chrome || browser).extension.getURL('pl_only_dict.json')});
});

document.getElementById('switch').addEventListener('click', function () {
    (chrome || browser).runtime.sendMessage({type: "switchState", state: document.getElementById('switch').checked});
});

