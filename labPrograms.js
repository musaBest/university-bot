const path = require("path");
const labPrograms = {
  " Introduction to Computers_Lab": {
    text: "📱 نزل تطبيق بايثون (خفيف على الجوال)",
    link: "https://play.google.com/store/apps/details?id=ru.iiec.pydroid3"
  },

  "Computer programing 1&2_Lab": {
    text: "💻 نزل IDE للـ Java (مثل NetBeans)",
    link: "https://youtu.be/_8nw6Tnu67E?si=YZydmjdSpcjLN3Ms"
  },

  "Digital Design 1,2_Lab ": {
    text: "⚙️ برنامج Logisim مطلوب",
    link: "https://drive.google.com/drive/folders/1nmWpiWEX-WeTpDT8jqbE6sbjljDjXRsI"
  },
  
  " Computer architecture_Lab": {
    text: "⚙️ برنامج Logisim مطلوب",
    link: "https://drive.google.com/drive/folders/1nmWpiWEX-WeTpDT8jqbE6sbjljDjXRsI"
  },

  " Electronics 1_Lab ": {
    text: "🔌 برنامج LTSpice",
    link: "https://www.analog.com/en/resources/design-tools-and-calculators/ltspice-simulator.html"
  },

  " Electric Circuits 1_Lab": {
    text: "🔌 برنامج LTSpice",
    link: "https://www.analog.com/en/resources/design-tools-and-calculators/ltspice-simulator.html"
  },

  " Digital Electronics_Lab ": {
    text: "🔌 برنامج LTSpice",
    link: "https://www.analog.com/en/resources/design-tools-and-calculators/ltspice-simulator.html"
  },

  " Signals_Lab ": {
    text: " برنامج MATLAB",
    link: "https://getintopc.com/softwares/analysis/matlab-r2024b-free-download/"
  },



  "Control_Lab ": {
    text: "📊 تحتاج MATLAB + LabVIEW",
    links: [
      { name: "MATLAB", url: "https://getintopc.com/softwares/analysis/matlab-r2024b-free-download/" },
      { name: "LabVIEW", url: "https://drive.google.com/file/d/10rhYP0jm-cw37jqTCwVBJ-Hjd3vs6Hly/view?usp=drivesdk" }
    ]
  },

  "Database_Lab ": {
    text: "🗄️ لازم تنزل البرنامجين",
    links: [
      { name: "SQL Developer", url: "https://drive.google.com/file/d/1L8BBwgJxvE4FctO78oCEpPD59smrkdWz/view?usp=drivesdk" },
      { name: "Oracle", url: "https://drive.google.com/file/d/14l2cjXkyqyPpDZzSrc2KJ6PEHMl4tkAt/view?usp=drivesdk" }
    ]
  },

  "Data Communications_Lab ": {
    text: "🌐 برنامج Wireshark",
    link: "https://www.wireshark.org/download.html"
  },

  "Assembly_Lab ": {
    text: "🧠 برنامج VS Code",
    link: "https://visualstudio.microsoft.com/thank-you-downloading-visual-studio/?sku=Enterprise"
  },

  "Operating Systems_Lab ": {
    text: "🐧 شرح تثبيت Ubuntu",
    link: "https://www.youtube.com/watch?v=-1S5qisIx8I"
  },

  "VHDL_lab": {
    text: "🔧 برنامج Quartus",
    link: "https://www.intel.com/content/www/us/en/software-kit/757262/intel-quartus-prime-lite-edition-design-software-version-22-1-for-windows.html",
    file:"VHDL Install software.pdf"
  },

  "Image Processing ": {
    text: "🖼️ برنامج Octave",
    link: "https://ftpmirror.gnu.org/octave/windows/octave-10.1.0-w64-installer.exe"
  }
};


module.exports = { labPrograms };
