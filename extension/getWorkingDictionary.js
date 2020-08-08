const deleteMapping = (word) => {
    (chrome || browser).runtime.sendMessage({type: "deleteMapping", word: word});
};

(chrome || browser).runtime.sendMessage({type: "getWorkingDictionary"}, (response) => {
    console.log(response);
    Object.entries(JSON.parse(response.workingDictionary)).forEach(
        ([key, value]) => {
            const wordDiv = $(`
                <div>
                    ${key + " -> " + value}
                </div>`);

            const deleteButton = $(`<button>Usuń</button>`);
            deleteButton.click(function() {
                deleteMapping(key);
                $(this).parent().remove();
            });
            wordDiv.append(deleteButton);

            $('#wordList').append(wordDiv);
        }
    );
});



