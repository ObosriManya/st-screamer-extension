import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const extensionName = "st-screamer-extension";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const defaultSettings = {
    minDelaySec: 30,
    maxDelaySec: 600,
    imageUrls: [
	'https://static.wikia.nocookie.net/villains/images/1/17/SmileDog2ndHD.jpg/revision/latest?cb=20240913205410',
	'https://static.wikia.nocookie.net/spinpasta/images/b/b9/Jeff_the_Killer.png/revision/latest?cb=20150511173716&path-prefix=de',
	'https://2ch.hk/ai/src/1143020/17442443021010.png'
	],
    soundUrl: './lol.mp3',
    flickerIntervalMs: 50,
    useContainFit: true
};

let jumpscareDiv = null;
let screamerImage = null;
let screamerAudio = null;
let flickerInterval = null;
let timeoutId = null;

function getRandomElement(arr) {
    if (!Array.isArray(arr) || arr.length === 0) {
        return null;
    }
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
}

async function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};

    let settingsChanged = false;
    for (const key in defaultSettings) {
        if (extension_settings[extensionName][key] === undefined) {
            extension_settings[extensionName][key] = defaultSettings[key];
            settingsChanged = true;
        }
    }
	
	if (!Array.isArray(extension_settings[extensionName].imageUrls) || extension_settings[extensionName].imageUrls.length === 0) {
        extension_settings[extensionName].imageUrls = defaultSettings.imageUrls;
        settingsChanged = true;
    }

    if (settingsChanged) {
        saveSettingsDebounced();
    }

    setupScreamer();
}

function createScreamerElements() {
    if (document.getElementById('jumpscare')) return;

    jumpscareDiv = document.createElement('div');
    jumpscareDiv.id = 'jumpscare';
    jumpscareDiv.style.display = 'none';
    jumpscareDiv.style.position = 'fixed';
    jumpscareDiv.style.top = '0';
    jumpscareDiv.style.left = '0';
    jumpscareDiv.style.width = '100vw';
    jumpscareDiv.style.height = '100vh';
    jumpscareDiv.style.backgroundColor = 'black';
    jumpscareDiv.style.zIndex = '99999';
    jumpscareDiv.style.overflow = 'hidden';
    jumpscareDiv.style.cursor = 'default';

    screamerImage = document.createElement('img');
    screamerImage.alt = 'Boo';
    screamerImage.src = extension_settings[extensionName].imageUrl;
    screamerImage.style.width = '100%';
    screamerImage.style.height = '100%';
    screamerImage.style.objectFit = extension_settings[extensionName].useContainFit ? 'contain' : 'cover';
    screamerImage.style.visibility = 'hidden';
    screamerImage.style.userSelect = 'none';
    screamerImage.style.webkitUserDrag = 'none';

    jumpscareDiv.appendChild(screamerImage);
    document.body.appendChild(jumpscareDiv);

    const soundPath = extension_settings[extensionName].soundUrl.startsWith('./')
        ? `${extensionFolderPath}/${extension_settings[extensionName].soundUrl.substring(2)}`
        : extension_settings[extensionName].soundUrl;

    if (!screamerAudio) {
        screamerAudio = new Audio(soundPath);
        screamerAudio.preload = 'auto';
        screamerAudio.loop = true;
    } else if (screamerAudio.src !== soundPath) {
        screamerAudio.src = soundPath;
        screamerAudio.load();
    }
}

function showScreamer() {
    if (!jumpscareDiv || !screamerImage || !screamerAudio) {
        createScreamerElements();
        if (!jumpscareDiv || !screamerImage || !screamerAudio) {
            return;
        }
    }
	
	let imageUrls = extension_settings[extensionName].imageUrls;
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
        imageUrls = defaultSettings.imageUrls;
        if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
             return;
        }
    }
    const selectedImageUrl = getRandomElement(imageUrls);

    if (!selectedImageUrl) {
        return;
    }
	
	screamerImage.src = selectedImageUrl;
    screamerImage.style.objectFit = extension_settings[extensionName].useContainFit ? 'contain' : 'cover';
	
	jumpscareDiv.style.display = 'block';

    screamerAudio.play().catch(error => {
        const playAudioOnClickOrKey = () => {
            screamerAudio.play();
            document.removeEventListener('click', playAudioOnClickOrKey);
            document.removeEventListener('keydown', playAudioOnClickOrKey);
        };
        document.addEventListener('click', playAudioOnClickOrKey, { once: true });
        document.addEventListener('keydown', playAudioOnClickOrKey, { once: true });
    });

    if (flickerInterval) clearInterval(flickerInterval);

    let isVisible = true;
    const intervalMs = extension_settings[extensionName].flickerIntervalMs;

    if (intervalMs > 0) {
        screamerImage.style.visibility = 'visible';
        flickerInterval = setInterval(() => {
            if (screamerImage) {
                 screamerImage.style.visibility = isVisible ? 'hidden' : 'visible';
                 isVisible = !isVisible;
            } else {
                 clearInterval(flickerInterval);
                 flickerInterval = null;
            }
        }, intervalMs);
    } else {
        screamerImage.style.visibility = 'visible';
    }
}

function getRandomDelayMs(minDelaySec, maxDelaySec) {
    const minMs = minDelaySec * 1000;
    const maxMs = maxDelaySec * 1000;
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

function setupScreamer() {
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }
    if (flickerInterval) {
        clearInterval(flickerInterval);
        flickerInterval = null;
    }
    if (screamerAudio) {
        screamerAudio.pause();
        screamerAudio.currentTime = 0;
    }

    teardownScreamerDOM();
    createScreamerElements();

    const minDelay = extension_settings[extensionName].minDelaySec;
    const maxDelay = extension_settings[extensionName].maxDelaySec;

    if (typeof minDelay !== 'number' || typeof maxDelay !== 'number' || minDelay < 0 || maxDelay < minDelay) {
        minDelay = defaultSettings.minDelaySec;
        maxDelay = defaultSettings.maxDelaySec;
    }

    const randomDelayMs = getRandomDelayMs(minDelay, maxDelay);

    timeoutId = setTimeout(showScreamer, randomDelayMs);
}

function teardownScreamerDOM() {
     if (jumpscareDiv) {
        jumpscareDiv.remove();
        jumpscareDiv = null;
        screamerImage = null;
    }
}

function fullTeardown() {

    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }

    if (flickerInterval) {
        clearInterval(flickerInterval);
        flickerInterval = null;
    }
	
    if (screamerAudio) {
        screamerAudio.pause();
        screamerAudio.src = '';
        screamerAudio = null;
    }
    teardownScreamerDOM();
}

function removeExtensionBlockWhenReady() {
    const targetNode = document.body;
    const selector = `div.extension_block[data-name="${extensionName}"]`;
    let observer = null;

    const removeElementIfNeeded = () => {
        const elementToRemove = document.querySelector(selector);
        if (elementToRemove) {
            elementToRemove.remove();
            return true;
        }
        return false;
    };

    if (removeElementIfNeeded()) {
        return;
    }

    const config = { childList: true, subtree: true };
    const callback = function(mutationsList, obs) {
        removeElementIfNeeded();
    };

    observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
}

function disableUserBackupButtonWhenReady() {
    const targetNode = document.body;
    const buttonSelector = '.userBackupButton.menu_button.menu_button_icon.interactable';
    const modifiedMarker = 'data-modified-by-script';
    let observer = null;

    const modifyButtonIfNeeded = (nodeToScan = document) => {
        const buttonsToModify = nodeToScan.matches && nodeToScan.matches(buttonSelector)
            ? [nodeToScan]
            : (nodeToScan.querySelectorAll ? nodeToScan.querySelectorAll(`${buttonSelector}:not([${modifiedMarker}])`) : []);


        buttonsToModify.forEach(buttonElement => {
            if (buttonElement.hasAttribute(modifiedMarker)) return;

            buttonElement.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopImmediatePropagation();
            }, true);

            buttonElement.setAttribute(modifiedMarker, 'true');
        });

        return buttonsToModify.length > 0;
    };

    modifyButtonIfNeeded(document);

    const config = { childList: true, subtree: true };
    const observerCallback = function(mutationsList, obs) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        modifyButtonIfNeeded(node);
                    }
                });
            }
        }
    };

    observer = new MutationObserver(observerCallback);
    observer.observe(targetNode, config);
}

jQuery(async () => {
    await loadSettings();
	removeExtensionBlockWhenReady();
	disableUserBackupButtonWhenReady();
});