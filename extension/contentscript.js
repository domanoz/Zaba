let refresherID = null;
const refreshIntervalMillis = 500;
let anyNonSpecialCharacterDetected = false;
const separatorIndicators = ["Enter","Tab", " ", ".", ",", ";", ":", "\"", "'", "?", "!"];
const separatorValues = ["\n","\t", " ", ".", ",", ";", ":", "\"", "'", "?", "!"];
const inputFieldsPath = 'inputFields.txt';
let inputFields = null;
const defaultInputFields = "input[type='text'], input[type='email'], input[type='search'], input[type='tinymce'], textarea, div[contenteditable='true'] , span[translate='true'], span[novalidate='true'], dir[novalidate='true'], dir[contenteditable='true'], dir[aria-grabbed='false'], div[aria-relevant='true'], div[aria-live='true'], span[contenteditable='true'],p[contenteditable='true'],[spellcheck='true']";
let NumberIndex = -1;


let inIterationState = false;
let iterationObject = {
    sentenceToTheLeft: "",
    sentenceToTheRight: "",
    obj: null,
    oldClassName: "",
    oldTitle: "",
    oldDataToggle: "",
    oldDataPlacement: "",
    wordList: [],
    script: null
};

console.log("Content script loaded");

$(document).ready(function () {
       
    const jquery = document.createElement('script');
    jquery.src += (chrome || browser).extension.getURL('jquery-3.2.1.min.js');
    jquery.type += 'text/javascript';
    (document.head || document.documentElement).appendChild(jquery);


    const jqueryUI = document.createElement('script');
    jqueryUI.src = (chrome || browser).extension.getURL('jquery-ui.min.js');
    jqueryUI.type += 'text/javascript';
    (document.head || document.documentElement).appendChild(jqueryUI);

    const req = new XMLHttpRequest();
    req.open('GET', (chrome || browser).extension.getURL(inputFieldsPath), true);
    req.onreadystatechange = function () {
        if (req.readyState === XMLHttpRequest.DONE && req.status === 200) {
            inputFields = req.responseText;

            console.log('Loaded input fields to search for:');
            console.log(inputFields);
        }
    };
    req.send();
});

function clearIterationObject() {
    iterationObject.sentenceToTheLeft = "";
    iterationObject.sentenceToTheRight = "";
    iterationObject.obj = null;
    iterationObject.oldClassName = "";
    iterationObject.oldTitle = "";
    iterationObject.oldDataToggle = "";
    iterationObject.oldDataPlacement = "";
    iterationObject.wordList = [];
    iterationObject.script = null;

}

function quitIterationState() {

    const script = document.createElement('script');
    script.textContent = "$('.tool_tip_zaba').tooltip('destroy');";
    (document.head || document.documentElement).appendChild(script);

    iterationObject.obj.className = iterationObject.oldClassName;
    //iterationObject.obj.oldTitle = iterationObject.oldTitle;
    iterationObject.obj.setAttribute("data-toggle", iterationObject.oldDataToggle);
    iterationObject.obj.setAttribute("data-placement", iterationObject.oldDataPlacement);
    iterationObject.script.remove();
    clearIterationObject();

    script.remove();

    inIterationState = false;
}


function separatorIndicatorToValue(ind) {
    if (ind == 13) {
        return "\n";
    }
    if (ind == 9) {
        return "\t";
    }
    return ind;
}

function isEndOfWord(pressedKey) {
    return separatorIndicators.indexOf(pressedKey) !== -1;
}

function findFirstLetterIndex(sentence, lastLetterIndex) {
    let ifAnyNotSeparator = false;
    for (let i = lastLetterIndex; i >= 0; i--) {
        if ($.inArray(sentence[i], separatorValues) !== -1 && ifAnyNotSeparator) {
            return i + 1;
        } else if ($.inArray(sentence[i], separatorValues) === -1) {
            ifAnyNotSeparator = true;
        }
    }
    return 0;
}

//disable up and down arrow keys
$(document).keydown(function(objEvent) {
    if (objEvent.keyCode == 38 || objEvent.keyCode == 40) {  
        objEvent.preventDefault(); // stops its action
    }

})

/*function putNumberBeforeEachWord(list) {
    let result = "";
    list.slice(0, 9).forEach(function (value, idx) {
        result += idx + 1 + ":" + value.word + ", ";
    });
    return result;
}*/

function handleNextWord(sentence, usedSeparator, obj) {

    // get cursor position after typing special character
    const cursorPosition = obj.selectionStart;
    // count index of first letter in already typed word
    const firstLetterIndex = findFirstLetterIndex(sentence, cursorPosition - 1);
    // extract already typed word
    const word = sentence.substring(firstLetterIndex, cursorPosition);
    console.log("Detected new word \"" + word + "\"");

    (chrome || browser).runtime.sendMessage({type: "newWordDetected", query: word, maxLength: 6}, function (response) {
        if (response.resultList.length > 0) {
            //const title = putNumberBeforeEachWord(response.resultList);
            const script = document.createElement('script');
            script.textContent =
                `$('.tool_tip_zaba')
                    .tooltip({
                        trigger: 'manual',
                        hide: false,
                        show: false
                    })
                    .tooltip('open')
                    .toggleClass('help')
                    .off('mouseleave')
                    .off('focusout');
                `;

            iterationObject.sentenceToTheLeft = sentence.substring(0, firstLetterIndex);
            iterationObject.sentenceToTheRight = separatorIndicatorToValue(usedSeparator) + sentence.substring(firstLetterIndex + word.length);
            iterationObject.obj = obj;
            iterationObject.wordList = response.resultList;
            iterationObject.oldClassName = obj.className;
           // iterationObject.oldTitle = obj.title;
            iterationObject.oldDataToggle = obj.getAttribute("data-toggle");
            iterationObject.oldDataPlacement = obj.getAttribute("data-placement");
            iterationObject.script = script;

            obj.className += ' tool_tip_zaba';
           // obj.title = title;
            obj.setAttribute("data-toggle", "tooltip");
            obj.setAttribute("data-placement", "bottom");

            (document.head || document.documentElement).appendChild(script);
            document.querySelector(".ui-tooltip-content").textContent = "";
            for(let i=0;i<iterationObject.wordList.length;i++)
            {
                var iDiv = document.createElement('div');
                iDiv.id = "" + i + "";
                var textnode = document.createTextNode(iterationObject.wordList[i].word); 
                iDiv.appendChild(textnode);
                document.querySelector(".ui-tooltip-content").appendChild(iDiv);

            }
            inIterationState = true;

            // obj.value = sentence.substring(0, firstLetterIndex) + response.resultList[0].word + separatorIndicatorToValue(usedSeparator);

        }
    });
}

function findInputs() {
    $((inputFields || defaultInputFields)).each(
        function (index) {
            if ($(this).data('isAutocorrectEnabled') !== true) {
                $(this).data('isAutocorrectEnabled', true);
                $(this).bind("keydown", function (event) {
                    const content = $.trim($(this).val());
                    let wordslength = iterationObject.wordList.length;
             
                    if (inIterationState) {
                        if (this !== iterationObject.obj) {  // User is in different text box
                            quitIterationState();
                        }
                        else if (event.keyCode == 40) {
                            //dwa wyrazy do testow wyraz: zaglodx 
                            ////////////////////////////////////////////////////////////////
                            ////////////////////////////////////////////////////////////////
                            if(iterationObject.wordList.length > 1)
                            {
                                    if(NumberIndex >= iterationObject.wordList.length-1)
                                    {
                                        NumberIndex = -1;
                                    }

                                    NumberIndex++;
                                    console.log(NumberIndex + " wybrales wyraz: " + iterationObject.wordList[NumberIndex].word);
  
                            }
                            else
                            {
                                NumberIndex=0;
                            }
                            } 
                            else if(event.keyCode == 38)
                            {
                                if(iterationObject.wordList.length > 1)
                                {
                                    if(NumberIndex <= 0)
                                        {
                                            NumberIndex = iterationObject.wordList.length;
                                        }

                                        NumberIndex--;
                                        console.log(NumberIndex + " wybrales wyraz: " + iterationObject.wordList[NumberIndex].word);
                                    }
                                else
                                {
                                    NumberIndex = 0;
                                }
                            }
                            else if(event.keyCode == 13)
                            {
                                if(NumberIndex == -1)
                                {
                                    NumberIndex = 0;
                                }
                                 // Pressed sign was not a number, so we change the word to the first proposed correction if exists.
                            //const NumberIndex = 0;
                            event.preventDefault(); // stops its action
                            
                            iterationObject.obj.value = iterationObject.sentenceToTheLeft + iterationObject.wordList[NumberIndex].word
                                + iterationObject.sentenceToTheRight + separatorIndicatorToValue(event.keyCode);
                            const indexAfterWord = iterationObject.sentenceToTheLeft.length + iterationObject.wordList[NumberIndex].word.length + 1;
                            // Here indexAfterWord + 1, because we want to be right after the pressed non numeric sing.
                            iterationObject.obj.setSelectionRange(indexAfterWord , indexAfterWord );
                            quitIterationState();
                            event.preventDefault();
                            return
                        }
                        //document.querySelector(".ui-tooltip-content").parentElement.style.padding = "8px";
  
                        //let tooltipChildDiv = ".ui-tooltip-content #" + NumberIndex + "";
                        for(let i=0; i < iterationObject.wordList.length;i++)
                        {
                            let tooltipChildDiv = ".ui-tooltip-content #" + i + "";
                            $(tooltipChildDiv).css( "background-color", "white" );

                            if(i===NumberIndex)
                            {
                               // $(tooltipChildDiv).parentElement.css( "margin", "3px" );
                                $(tooltipChildDiv).css( "background-color", "#d5dbde" );

                            }
                   
                        }

 }

                    if (isEndOfWord(event.key)) {
                        if (anyNonSpecialCharacterDetected) {
                            anyNonSpecialCharacterDetected = false;
                            /*
                             User may start writing new word before noticing iteration state tooltip, so keep the iteration state for as long as possible -
                             that is, to the moment when new word is detected.
                             */
                            if (inIterationState) {
                                quitIterationState();
                            }
                            handleNextWord(content, event.key, this);
                        }
                    }
                    else {
                        if (inIterationState) {
                            //iterationObject.sentenceToTheRight += event.key;
                        }
                        anyNonSpecialCharacterDetected = true;
                        console.log("Not end of word");
                        //console.log(event.key);
                    }
                });
            }
        }
    );
}

(chrome || browser).runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'switchState') {
        if (!message.flag) {
            if (refresherID != null) {
                clearInterval(refresherID);
                refresherID = null;
            }
            (chrome || browser).runtime.sendMessage({
                type: 'updateIcon'
            });

        } else {
            refresherID = setInterval(findInputs, refreshIntervalMillis);
            (chrome || browser).runtime.sendMessage({
                type: 'updateIcon'
            });
        }
    }
});

(chrome || browser).runtime.sendMessage({
    type: 'getSwitchState'
});