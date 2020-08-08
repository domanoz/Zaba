let toReplace;

// Obtaining word to replace
(chrome || browser).runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        toReplace = request.toReplace.trim();
        document.getElementById("toReplace").innerHTML = toReplace;
    });

// Sending back result
document.getElementById('save').addEventListener('click', function () {
    const replacement = document.getElementById('replacement').value.trim();
    if (replacement !== "") {
        (chrome || browser).runtime.sendMessage({
            type: "newWordsForWorkingDictionary",
            toReplace: toReplace,
            replacement: replacement
        });
        window.close();
    } else {
        document.getElementById('replacement').style.borderColor = "red";
    }
});

