# Tamil Wordle (தமிழ் சொற்கள்)

This is a game based on [Wordle](https://www.powerlanguage.co.uk/wordle/), but 
using words from the Tamil language.

## Gameplay Modifications for Tamil

Since Tamil is written using an abugida script (every consonant-vowel/உயிர்மெய் 
pair gets a distinct symbol), the logic for making and displaying guesses is a 
bit more complicated than in English.  Every "letter" in the game can be either 
a pure vowel (உயிரெழுத்து, only at the beginning of a word), a consonant-vowel pair 
(உயிர்மெய்யெழுத்து, inputted as a consonant followed by a vowel), or a pure consonant 
(மெய்யெழுத்து, inputted as a consonant without a following vowel).  Tamil-Grantha 
consonants are treated as normal Tamil consonants, but the aydham letter (ஆய்த 
எழுத்து), ஃ, is given special treatment—it behaves like a consonant for the most 
part, but it cannot combine with a vowel.

When results are shown, each "letter" square can have two different statuses; 
the colors of the border reflect the correctness of the vowel, and the colors 
of the center reflect the correctness of the consonant.  This leads to some 
weird edge cases on words which start with a pure vowel, since they may show as 
both correct and wrong at the same time (i.e., that vowel _is_ present in that 
square, but there needs to be a consonant before it).  For the purposes of 
displaying results, the virama/pulli/புள்ளி is treated as a vowel diacritic, as is 
the inherent vowel அ.  Pure vowels have their results shown in both the 
consonant and vowel areas (both the background and border of the square).

Based on the distribution of lengths from `ta.wl`, a length of four "base" 
letters was chosen as optimal.  This is actually closer to a length of eight 
letters as it would be defined by the English Wordle (up to four vowels and 
four consonants), but only certain combinations of letters are valid based on 
the phonology of Tamil, so it only feels slightly more difficult than the 
English version.

## Word Source

The base word list (`ta.wl`) is copied from [GNU Aspell](http://aspell.net/).  
This is piped through UNIX `shuf` to produce a non-alphabetical version of the 
word list (`ta-shuf.wl`).  The frontend filters this list to only words which 
match its calculation of length (four "base" letters, either consonants or full 
vowels, plus any number of vowel diacritics attached to the consonants), and 
indexes into the filtered list using the number of days since the program was 
written (February 4, 2022).

## Result Display

Even though there are only four squares displayed on the frontend, results are 
displayed as eight square emojis; each represents a consonant-vowel pair (the 
first square in each pair is the consonant, the second is the vowel).

## Open Source License

This code is open-source under the [GPLv2 license](COPYING.txt).  The word list 
this program uses comes from GNU Aspell, which is also open-source under the 
GPLv2 license.

## Other

This was inspired by [Wordle](https://www.powerlanguage.co.uk/wordle/) 
(obviously) and [Shabdle: Wordle in Hindi](https://kach.github.io/shabdle/).
