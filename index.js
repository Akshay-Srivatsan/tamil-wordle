const PARAMS = new URLSearchParams(window.location.search);
const WORDLE = "wordle";
const RANDOM = "random";
const MODE = (() => {
    let mode = PARAMS.get("mode");
    if (mode === "random") return RANDOM;
    return WORDLE;
})();

if (MODE === RANDOM) {
    let targets = document.querySelectorAll(".show-in-random-mode");
    for (let target of targets) {
        target.classList.remove("hidden");
    }
    document.documentElement.classList.add("random-mode");
    console.log("Random mode enabled");
} else {
    let targets = document.querySelectorAll(".show-in-wordle-mode");
    for (let target of targets) {
        target.classList.remove("hidden");
    }
    console.log("Random mode enabled");
}

const MAX_LENGTH = 4;
const MAX_GUESSES = 6;
const TRANSITION_TIME = 500;
const RESET_TIME = 100;
const VERSION = "1";

let speed_scale = 1;

const DATE = new Date();
let target = null;

function getDateString() {
    let year = DATE.getFullYear().toString();
    let month = (DATE.getMonth() + 1).toString();
    if (month.length === 1) month = "0" + month;
    let day = DATE.getDate().toString();
    if (day.length === 1) day = "0" + day;
    return year + "-" + month + "-" + day;
}

function toDiacritic(x) {
    if (x === A) return "";
    return String.fromCharCode(x.charCodeAt(0) + 0x38)
}

function fromDiacritic(x) {
    if (x === PULLI) return "";
    return String.fromCharCode(x.charCodeAt(0) - 0x38)
}

let guesses = [];
let guess = [];
let currentLetter = null;

let canGuessVowel = true;
let canGuessConsonant = true;
const TAMIL_VOWELS = ["அ", "ஆ", "இ", "ஈ", "உ", "ஊ", "எ", "ஏ", "ஐ", "ஒ", "ஓ", "ஔ"];
const [A, AA, I, II, U, UU, E, EE, AI, O, OO, AU] = TAMIL_VOWELS;
const PULLI = "\u0BCD";
const TAMIL_DIACRITICS = [PULLI].concat([AA, I, II, U, UU, E, EE, AI, O, OO, AU].map(toDiacritic));
const VISARGA = "\u0B83";

const START_DATE = new Date(2022, 01, 04, 00, 00, 00); // 2022-02-04

let vowels = document.querySelectorAll(".vowel");
let consonants = document.querySelectorAll(".consonant");
let controls = document.querySelectorAll(".control");

let resetting = false;
let submitting = false;
let finished = false;
let won = false;

let wordlist = null;

function createWordList(list) {
    let words = list.split('\n');
    wordlist = words.filter(x => parseWord(x).length === MAX_LENGTH).map(x => x.normalize());
}

function getWordForDay(date) {
    let difference = Math.abs(date.getTime() - START_DATE.getTime()) / (1000 * 60 * 60 * 24);
    let days = Math.floor(difference);
    return wordlist[days % wordlist.length];
}

function getRandomWord() {
    let index = Math.floor(Math.random() * wordlist.length);
    let word = wordlist[index];
    console.log("The random word is '%s'.", word);
    target = word;
    return word;
}

function getTarget() {
    if (target) return target;
    if (MODE === RANDOM) return getRandomWord();
    return getWordForDay(DATE);
}

fetch('ta-shuf.wl').then(response => response.text()).then(createWordList);

function parseWord(word) {
    let letters = [];
    let letter = null;
    for (let i = 0; i < word.length; i++) {
        let c = word.charAt(i);
        if (TAMIL_VOWELS.indexOf(c) !== -1) {
            letters.push(c);
        } else if (TAMIL_DIACRITICS.indexOf(c) !== -1) {
            let last = letters.pop().charAt(0);
            last += fromDiacritic(c);
            letters.push(last);
        } else {
            letters.push(c + A);
        }
    };
    if (letter) letters.push(letter);
    return letters;
}

function fullGuess() {
    let full = [...guess];
    if (currentLetter !== null) full.push(currentLetter);
    return full;
}

function updatePossibilities() {
    writeToLocalStorage();
    let fg = fullGuess();
    let full = fg.join("");
    if (full.length === 0) {
        canGuessVowel = true;
        canGuessConsonant = true;
    } else if (fg.length === MAX_LENGTH) {
        let last = full.charAt(full.length - 1);
        canGuessConsonant = false;
        canGuessVowel = TAMIL_VOWELS.indexOf(last) === -1;
    } else {
        let last = full.charAt(full.length - 1);
        if (TAMIL_VOWELS.indexOf(last) !== -1) {
            canGuessConsonant = true;
            canGuessVowel = false;
        } else {
            if (last === VISARGA) {
                canGuessVowel = false;
            } else {
                canGuessVowel = true;
            }
            canGuessConsonant = true;
        }
    }
    updateButtons();
}

function updateButtons() {
    for (let vowel of vowels) {
        if (finished || submitting || resetting || !canGuessVowel) {
            vowel.classList.add("disabled");
        } else {
            vowel.classList.remove("disabled");
        }
    }

    for (let consonant of consonants) {
        if (finished || submitting || resetting || !canGuessConsonant) {
            consonant.classList.add("disabled");
        } else {
            consonant.classList.remove("disabled");
        }
    }

    if (finished || submitting || resetting || fullGuess().length === 0) {
        document.getElementById("reset").classList.add("disabled");
    } else {
        document.getElementById("reset").classList.remove("disabled");
    }

    if (finished || submitting || resetting || fullGuess().length === 0) {
        document.getElementById("backspace").classList.add("disabled");
    } else {
        document.getElementById("backspace").classList.remove("disabled");
    }

    if (finished || submitting || resetting || fullGuess().length !== MAX_LENGTH) {
        document.getElementById("enter").classList.add("disabled");
    } else {
        document.getElementById("enter").classList.remove("disabled");
    }
}

function guessVowel(e) {
    let vowel = e.target.innerHTML;
    if (canGuessVowel) {
        if (!currentLetter) currentLetter = "";
        currentLetter += vowel;
        renderGuess();
        updatePossibilities();
    }
}

function guessConsonant(e) {
    let consonant = e.target.innerHTML;
    if (canGuessConsonant) {
        if (currentLetter) guess.push(currentLetter);
        currentLetter = consonant;
        renderGuess();
        updatePossibilities();
    }
}

function processedGuess() {
    return fullGuess().map((letter, i) => {
        if (TAMIL_VOWELS.indexOf(letter) !== -1) return letter;
        if (letter === VISARGA) return letter;
        if (letter.length === 1) return letter + "\u0BCD";
        let consonant = letter.charAt(0);
        let vowel = letter.charAt(1);
        if (vowel === A) {
            return consonant;
        }
        let diacritic = String.fromCharCode(vowel.charCodeAt(0) + 0x38);
        return consonant + diacritic;
    });
}

function renderGuess() {
    let guessNum = guesses.length;
    let guessDiv = document.querySelectorAll(".guess")[guessNum];
    let letters = guessDiv.querySelectorAll(".letter");
    let n = letters.length;
    let processed = processedGuess();
    for (let i = 0; i < n; i++) {
        let x = processed[i] || "";
        letters[i].innerHTML = x;
    };
}

function backspace() {
    if (submitting || finished) return;
    document.getElementById("message").innerHTML = "";
    if (!currentLetter && guess.length === 0) return;
    if (!currentLetter) currentLetter = guess.pop();
    currentLetter = currentLetter.slice(0, -1);
    if (currentLetter === "") {
        if (guess.length > 0)
            currentLetter = guess.pop();
        else
            currentLetter = null;
    }
    renderGuess();
    updatePossibilities();
}

function reset() {
    if (submitting || finished) return;
    if (!currentLetter && guess.length ===0) {
        resetting = false;
        updatePossibilities();
        return;
    }
    resetting = true;
    backspace();
    canGuessVowel = false;
    canGuessConsonant = false;
    setTimeout(reset, RESET_TIME * speed_scale);
}

function submitGuess() {
    if (!wordlist) {
        document.getElementById("message").innerHTML = "Please wait…";
        window.setTimeout(submitGuess, 500);
        return;
    }
    if (submitting || finished) return;
    document.getElementById("message").innerHTML = "";

    let normalized = processedGuess().join("").normalize();
    if (wordlist.indexOf(normalized) === -1) {
        document.getElementById("message").innerHTML = "Word not found!";
        return;
    }

    let targetWord = parseWord(getTarget());
    let guessedWord = fullGuess();
    if (guessedWord.length !== MAX_LENGTH) return;
    let guessNum = guesses.length;
    let guessDiv = document.querySelectorAll(".guess")[guessNum];
    let letters = guessDiv.querySelectorAll(".letter");
    submitting = true;

    let correct = true;

    for (let i = 0; i < guessedWord.length; i++) {
        let t = targetWord[i];
        let g = guessedWord[i];
        let correctVowel = false;
        let correctConsonant = false
        let vowelOccursElsewhere = false;
        let consonantOccursElsewhere = false;
        if (g.length === 1) {
            vowelOccursElsewhere = targetWord.some(x => x.indexOf(g) !== -1);
            consonantOccursElsewhere = targetWord.some(x => x.indexOf(g) !== -1);
        } else {
            vowelOccursElsewhere = targetWord.some(x => x.indexOf(g.charAt(1)) !== -1);
            consonantOccursElsewhere = targetWord.some(x => x.indexOf(g.charAt(0)) !== -1);
        }

        if (t.length === 1 && g.length === 1) {
            correctVowel = correctConsonant = (g === t);
        } else if (t.length === 1 && g.length === 2) {
            if (TAMIL_VOWELS.indexOf(t) === -1) {
                correctVowel = false;
                correctConsonant = (t === g.charAt(0));
            } else {
                correctConsonant = false;
                correctVowel = (t === g.charAt(1));
            }
        } else if (g.length === 1 && t.length === 2) {
            if (TAMIL_VOWELS.indexOf(g) === -1) {
                correctVowel = false;
                correctConsonant = (g === t.charAt(0));
            } else {
                correctConsonant = false;
                correctVowel = (g === t.charAt(1));
            }
        } else {
            correctConsonant = g.charAt(0) === t.charAt(0);
            correctVowel = g.charAt(1) === t.charAt(1);
        }
        correct = correct && (correctConsonant && correctVowel);

        let consonantState = correctConsonant * 2 + consonantOccursElsewhere;
        let vowelState = correctVowel * 2 + vowelOccursElsewhere;

        window.setTimeout(function() {
            setGuessState(letters[i], consonantState, vowelState);
            if (g.length === 1) {
                setKeyState(g.charAt(0), consonantState | vowelState);
            } else {
                setKeyState(g.charAt(0), consonantState);
                setKeyState(g.charAt(1), vowelState);
            }
        }, TRANSITION_TIME * i * speed_scale)
    };
    window.setTimeout(function() {
        submitting = false;
        if (won) {
            document.getElementById("message").innerHTML = "You won!";
            document.getElementById("message").classList.add('won');
            if (MODE !== RANDOM) {
                document.getElementById("copyresults").classList.add('won');
            }
        } else if (finished) {
            document.getElementById("message").innerHTML = "Sorry, the word was '" + getTarget() + "'; better luck tomorrow!";
            if (MODE === RANDOM) {
                document.getElementById("message").innerHTML = "Sorry, the word was '" + getTarget() + "'.";
            }
            document.getElementById("message").classList.add('lost');
        }
        updateButtons();
    }, TRANSITION_TIME * MAX_LENGTH * speed_scale);
    guesses.push(processedGuess().join(""));
    guess = [];
    currentLetter = null;
    if (correct) {
        finished = true;
        won = true;
    } else if (guesses.length >= MAX_GUESSES) {
        finished = true;
    }
    updatePossibilities();
}

function setKeyState(letter, state) {
    let keySets = ["vowel", "consonant"].map(x => document.getElementsByClassName(x));
    for (let keys of keySets) {
        for (let i = 0; i < keys.length; i++) {
            if (keys[i].innerHTML === letter) {
                if (state & 0b10)
                    keys[i].classList.add("correct");
                if (state & 0b01)
                    keys[i].classList.add("moved");
                if (!state)
                    keys[i].classList.add("wrong");
            }
        }
    }
}

function setGuessState(cell, c, v) {
    if (c & 0b10) {
        cell.classList.add('correctConsonant');
    } else if (c & 0b01) {
        cell.classList.add('movedConsonant');
    } else {
        cell.classList.add('wrongConsonant');
    }
    if (v & 0b10) {
        cell.classList.add('correctVowel');
    } else if (v & 0b01) {
        cell.classList.add('movedVowel');
    } else {
        cell.classList.add('wrongVowel');
    }
}

for (let vowel of vowels) {
    vowel.addEventListener("click", guessVowel);
}

for (let consonant of consonants) {
    consonant.addEventListener("click", guessConsonant);
}

function copyResults() {
    let string = "சொற்கள் " + getDateString() + "\n";

    for (let i = 0; i < guesses.length; i++) {
        let guessDiv = document.querySelectorAll(".guess")[i];
        let letters = guessDiv.querySelectorAll(".letter");
        for (let j = 0; j < MAX_LENGTH; j++) {
            let cell = letters[j];
            let correctConsonant = cell.classList.contains('correctConsonant');
            let correctVowel = cell.classList.contains('correctVowel');
            let movedConsonant = cell.classList.contains('movedConsonant');
            let movedVowel = cell.classList.contains('movedVowel');
            if (correctConsonant) {
                string += "🟩";
            } else if (movedConsonant) {
                string += "🟨";
            } else {
                string += "⬜";
            }
            if (correctVowel) {
                string += "🟩";
            } else if (movedVowel) {
                string += "🟨";
            } else {
                string += "⬜";
            }
        };
        if (i !== guesses.length - 1) {
            string += "\n";
        }
    };
    navigator.clipboard.writeText(string);
}

function tryGuess(symbols) {
    symbols.map(x => document.getElementById(x).dispatchEvent(new Event("click")));
}

document.getElementById("backspace").addEventListener("click", backspace);
document.getElementById("reset").addEventListener("click", reset);
document.getElementById("enter").addEventListener("click", submitGuess);
document.getElementById("copyresults").addEventListener("click", copyResults);

function init() {
    let guesses = document.getElementById("guesses");
    for (let i = 0; i < MAX_GUESSES; i++) {
        let guess = document.createElement("tr");
        guess.classList.add("guess");
        for (let j = 0; j < MAX_LENGTH; j++) {
            let letter = document.createElement("td");
            letter.classList.add("letter");
            guess.appendChild(letter);
        };
        guesses.appendChild(guess);
    };
}

function writeToLocalStorage() {
    if (MODE === RANDOM) {
        return;
    }
    let key = VERSION + ":" + getDateString();
    let value = {
        guesses,
        current: processedGuess().join(""),
    };
    localStorage[key] = JSON.stringify(value);
}

function replayFromLocalStorage() {
    if (MODE === RANDOM) {
        return;
    }
    let storage = window.localStorage;
    let key = VERSION + ":" + getDateString();
    let value = localStorage[key];
    if (!value) return;
    if (!wordlist) {
        setTimeout(replayFromLocalStorage, 500);
        return;
    }
    value = JSON.parse(value);
    replayGuesses(value.guesses, value.current);
}

function replayGuesses(guesses, current) {
    resetting = true;
    speed_scale = 0.1;
    if (guesses.length === 0) {
        if (typeof current === "object") {
            current = current.join("");
        }
        guess = parseWord(current);
        resetting = false;
        renderGuess();
        updatePossibilities();
        speed_scale = 1;
        return;
    }
    guess = parseWord(guesses[0]);
    renderGuess();
    submitGuess();
    setTimeout(() => {
        replayGuesses(guesses.slice(1), current);
    }, TRANSITION_TIME * MAX_LENGTH * speed_scale);
}

init();
replayFromLocalStorage();
