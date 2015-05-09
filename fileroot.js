var path = require('path');
// var process = require('process');

function fileRoot(filePaths) {
    var cwd = process.cwd();

    if (!filePaths.length) return cwd; // want exception or a fallback?

    filePaths.map(function(filePath) {
        return path.dirname(filePath).split(path.sep);
    })

    fileParts = fileParts.sort().reverse();

    var commonParentIndex = common(fileParts);

    return fileParts[0].slice(0, commonParentIndex + 1).join(path.sep);
}


function common(arr) {
    var i = 0;

    while (i < arr[0].length) {
        var folder = arr[0][i];

        for (var j = 1; j < arr.length; j++) {
            if (arr[j][i] != folder) {
                return i - 1;
            }
        }

        i++;
    }

    return i - 1;
}

module.exports = fileRoot;