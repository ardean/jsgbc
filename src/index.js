import $ from "jquery";
import notifier from "./notifier";
import GameBoy from "./gameboy";
import controller from "./controller";
import ControllerProfile from "./controller-profile";

notifier.appendTo(document.body);

const xboxControllerProfile = new ControllerProfile("Xbox Controller", {
  0: "b",
  1: "a",
  3: "fullscreen",
  4: "load",
  5: "save",
  7: "speed",
  8: "select",
  9: "start",
  12: "up",
  13: "down",
  14: "left",
  15: "right"
});

const keyboardProfile = new ControllerProfile("Keyboard", {
  13: "start",
  16: "select",
  37: "left",
  38: "up",
  39: "right",
  40: "down",
  88: "a",
  90: "b"
});

const canvas = document.getElementById("canvas");
const gameboy = new GameBoy(canvas);

function getSpeedValue(button) {
  return (button.value * 2) + 1;
}

controller.on("press", function (index, button) {
  const action = xboxControllerProfile.getAction(index);
  if (action === "save") {
    saveAndNotifyState();
  } else if (action === "load") {
    openAndNotifyState();
  } else if (action === "speed") {
    gameboy.setSpeed(getSpeedValue(button));
  } else if (action === "fullscreen") {
    toggleFullscreen();
  } else {
    gameboy.actionDown(action);
  }
});

controller.on("changed", function (index, button) {
  const action = xboxControllerProfile.getAction(index);
  if (action === "speed") {
    gameboy.setSpeed(getSpeedValue(button));
  }
});

controller.on("release", function (index) {
  const action = xboxControllerProfile.getAction(index);
  if (action === "speed") {
    gameboy.setSpeed(1);
  } else {
    gameboy.actionUp(action);
  }
});

controller.startListener();

$(document)
  .on("keydown", function (e) {
    const action = keyboardProfile.getAction(e.keyCode);
    if (action) {
      if (action === "save") {
        saveAndNotifyState();
      } else if (action === "load") {
        openAndNotifyState();
      } else {
        gameboy.actionDown(action);
      }

      e.preventDefault();
    }
  })
  .on("keyup", function (e) {
    const action = keyboardProfile.getAction(e.keyCode);
    if (action) {
      gameboy.actionUp(action);

      e.preventDefault();
    }
  });
$(canvas).on("dblclick", toggleFullscreen);

var uploadStateElement = document.getElementById("uploadState");
uploadStateElement.addEventListener("change", function () {
  if (this.files.length > 0) {
    var file = this.files[0];
    var binaryHandle = new FileReader();
    binaryHandle.onload = function () {
      if (this.readyState === 2) {
        gameboy.core.savedStateFileName = file.name;
        gameboy.core.returnFromState(JSON.parse(this.result));
      }
    };
    binaryHandle.readAsBinaryString(file);
  }
});

var downloadSnapshot = document.getElementById("downloadState");
downloadSnapshot.addEventListener("click", function () {
  saveData(gameboy.core.saveState(), gameboy.core.name + ".s0");
});

var romElement = document.getElementById("rom");
romElement.addEventListener("change", function () {
  if (this.files.length > 0) {
    var file = this.files[0];
    var binaryHandle = new FileReader();
    binaryHandle.onload = function () {
      if (this.readyState === 2) {
        gameboy.insertROM(this.result);
        gameboy.restart();
      }
    };
    binaryHandle.readAsBinaryString(file);
  }
});

window.addEventListener("unload", function () {
  gameboy.autoSave();
});

var saveData = (function () {
  var a = document.createElement("a");
  a.style.display = "none";
  document.body.appendChild(a);

  return function (data, fileName) {
    var json = JSON.stringify(data);
    var blob = new Blob([json], {
      type: "octet/stream"
    });
    var url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  };
}());

function saveAndNotifyState() {
  var filename = gameboy.core.name + ".s0";
  gameboy.saveState(filename);

  notifier.notify("Save " + filename);
}

function openAndNotifyState() {
  var filename = gameboy.core.name + ".s0";
  gameboy.openState(filename, canvas);

  notifier.notify("Loaded " + filename);
}

let isInFullscreen = false;

function toggleFullscreen() {
  if (isInFullscreen) {
    exitFullscreen();
  } else {
    fullscreen();
  }
}

function fullscreen() {
  isInFullscreen = true;
  canvas.style.position = "absolute";
  canvas.style.height = "100%";
  canvas.style.width = "100%";

  requestFullscreen();
  recomputeSize();
}

function exitFullscreen() {
  isInFullscreen = false;
  canvas.style.position = "";
  canvas.style.height = "";
  canvas.style.width = "";

  requestExitFullscreen();
  recomputeSize();
}

function requestExitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  }
}

function requestFullscreen() {
  if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  }
}

function recomputeSize() {
  gameboy.core.width = 160;
  gameboy.core.height = 144;
  gameboy.core.onscreenWidth = 160;
  gameboy.core.onscreenHeight = 144;

  gameboy.core.offscreenWidth = 160;
  gameboy.core.offscreenHeight = 144;
  gameboy.core.offscreenRGBCount = gameboy.core.offscreenWidth * gameboy.core.offscreenHeight * 4;

  gameboy.core.initLCD();
}
