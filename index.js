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
} else {
    let targets = document.querySelectorAll(".show-in-wordle-mode");
    for (let target of targets) {
        target.classList.remove("hidden");
    }
}
console.log("mode = %s", MODE);

const MAX_LENGTH = 4;
const MAX_GUESSES = 6;
const TRANSITION_TIME = 500;
const RESET_TIME = 100;
const VERSION = "2";

let speed_scale = 1;

const DATE = new Date();
let target = null;

function getDefinition() {
    return `
    <p>
    Definition of ${getTarget()}:
    <a href="https://www.shabdkosh.com/dictionary/english-tamil/${getTarget()}">Shabdkosh</a>,
    <a href="https://ta.wiktionary.org/wiki/${getTarget()}">Wiktionary</a>,
    <a href="https://agarathi.com/word/${getTarget()}">Agarathi</a>
    </p>
    `;
}

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
const AAYTHAM = "\u0B83";

const START_DATE = new Date(2022, 01, 04, 00, 00, 00); // 2022-02-04

let vowels = document.querySelectorAll(".vowel");
let consonants = document.querySelectorAll(".consonant");
let controls = document.querySelectorAll(".control");

let resetting = false;
let submitting = false;
let finished = false;
let won = false;
let replaying = false;

let wordlist = null;

function createWordList(list) {
    let words = list.split('\n');
    wordlist = words.filter(x => parseWord(x).length === MAX_LENGTH).map(x => x.normalize());
}

function getOffsetForDay(date) {
    if (date.getTimezoneOffset() != START_DATE.getTimezoneOffset()) {
        date = new Date(date.getTime() - (date.getTimezoneOffset() - START_DATE.getTimezoneOffset()) * 60 * 1000);
    }
    let difference = Math.abs(date.getTime() - START_DATE.getTime()) / (1000 * 60 * 60 * 24);
    let days = Math.floor(difference);
    return days % wordlist.length;
}

function getWordForDay(date) {
    return wordlist[getOffsetForDay(date)];
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
        } else if (c == AAYTHAM) {
            letters.push(c);
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
            if (last === AAYTHAM) {
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

    if (!finished) {
        if (fullGuess().length !== 0) {
            document.getElementById("message").innerHTML = "Current guess: '" + processedGuess().join("") + "'.";
        }
    }
}

function guessVowel(e) {
    let vowel = e.target.innerHTML;
    if (finished) return;
    if (canGuessVowel) {
        if (!currentLetter) currentLetter = "";
        currentLetter += vowel;
        renderGuess();
        updatePossibilities();
    }
}

function guessConsonant(e) {
    let consonant = e.target.innerHTML;
    if (finished) return;
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
        if (letter === AAYTHAM) return letter;
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

function getFrequencies(word) {
    let frequencies = {};

    for (let i = 0; i < MAX_LENGTH; i++) {
        let [x, y] = word[i];
        frequencies[x] = (frequencies[x] || 0) + 1;
        if (y === undefined) continue;
        frequencies[y] = (frequencies[y] || 0) + 1;
    }
    return frequencies;
}

function compareCorrectness(t, g) {
    if (t.length == 2 && g.length == 2) {
        return t.map((x, i) => x == g[i])
    }
    if (t.length == 1 && g.length == 1) {
        let x = t[0] == g[0];
        return [x, x];
    }
    if (t.length == 1 && g.length == 2) {
        return [false, t[0] == g[1]];
    }
    if (t.length == 2 && g.length == 1) {
        return [false, t[1] == g[0]];
    }
}

function expandWord(word) {
    return word.map(x => {
        if (x.length === 1) {
            if (TAMIL_VOWELS.includes(x)) {
                return [x];
            } else if (x == AAYTHAM) {
                return [x];
            } else {
                return [x, PULLI];
            }
        } else {
            return [x.charAt(0), x.charAt(1)];
        }
    });
}

function submitGuess() {
    if (!wordlist) {
        document.getElementById("message").innerHTML = "Please wait…";
        window.setTimeout(submitGuess, 500);
        return;
    }
    if (submitting || finished) return;
    document.getElementById("message").innerHTML = "";
    if (fullGuess().length !== MAX_LENGTH) return;

    let normalized = processedGuess().join("").normalize();
    if (!wordlist.includes(normalized)) {
        document.getElementById("message").innerHTML = "Word not found!";
        return;
    }

    let targetWord = expandWord(parseWord(getTarget()));
    let guessedWord = expandWord(fullGuess());
    if (guessedWord.length !== MAX_LENGTH) return;
    let guessNum = guesses.length;
    let guessDiv = document.querySelectorAll(".guess")[guessNum];
    let letters = guessDiv.querySelectorAll(".letter");
    submitting = true;

    let frequencies = getFrequencies(targetWord);

    let correctnesses = [];
    let movednesses = [];


    for (let i = 0; i < guessedWord.length; i++) {
        let t = targetWord[i];
        let g = guessedWord[i];

        let [consonantCorrect, vowelCorrect] = compareCorrectness(t, g);

        if (frequencies[g[0]]) frequencies[g[0]] -= consonantCorrect;
        if (frequencies[g[1]]) frequencies[g[1]] -= vowelCorrect;

        correctnesses.push([consonantCorrect, vowelCorrect]);
    };

    for (let i = 0; i < guessedWord.length; i++) {
        let [gc, gv] = guessedWord[i];
        let consonantMoved = false;
        let vowelMoved = false;

        let consonantCorrect = correctnesses[i][0];
        let vowelCorrect = correctnesses[i][1];

        if (frequencies[gc] > 0 && !consonantCorrect) {
            frequencies[gc]--;
            consonantMoved = true;
        }

        if (frequencies[gv] > 0 && !vowelCorrect) {
            frequencies[gv]--;
            vowelMoved = true;
        }

        movednesses.push([consonantMoved, vowelMoved]);
    };

    let correct = !correctnesses.map(([x, y]) => x && y).includes(false);

    for (let i = 0; i < MAX_LENGTH; i++) {
        window.setTimeout(function() {
            let [c, v] = guessedWord[i];
            let [consonantCorrect, vowelCorrect] = correctnesses[i];
            let [consonantMoved, vowelMoved] = movednesses[i];
            let cell = letters[i];
            if (consonantCorrect) {
                cell.classList.add('correctConsonant');
                getKey(c)?.classList.add('correct');
            } else if (consonantMoved) {
                cell.classList.add('movedConsonant');
                getKey(c)?.classList.add('moved');
            } else {
                cell.classList.add('wrongConsonant');
                getKey(c)?.classList.add('wrong');
            }
            if (vowelCorrect) {
                cell.classList.add('correctVowel');
                getKey(v)?.classList.add('correct');
            } else if (vowelMoved) {
                cell.classList.add('movedVowel');
                getKey(v)?.classList.add('moved');
            } else {
                cell.classList.add('wrongVowel');
                getKey(v)?.classList.add('wrong');
            }
        }, TRANSITION_TIME * i * speed_scale);
    }

    window.setTimeout(function() {
        submitting = false;
        if (finished) {
            document.getElementById("link").innerHTML = getDefinition();
        }
        if (won) {
            document.getElementById("message").innerHTML = "You won!";
            document.getElementById("message").classList.add('won');
            document.getElementById("copyresults").classList.add('won');
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

function getKey(letter) {
    let keySets = ["vowel", "consonant"].map(x => document.getElementsByClassName(x));
    for (let keys of keySets) {
        for (let i = 0; i < keys.length; i++) {
            if (keys[i].innerHTML === letter) {
                return keys[i];
            }
        }
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
    if (MODE === RANDOM) {
        string =  "சொற்கள் (Random Mode)\n";
    }

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
        if (MODE === RANDOM) {
            string += " (" + guesses[i] + ")";
        }
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
            let letter = document.createElement("div");
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
    if (replaying) return;
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
    replaying = true;
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
        replaying = false;
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
