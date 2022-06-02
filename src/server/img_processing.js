const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const sharp = require('sharp');
const tf = require('@tensorflow/tfjs-node');

var classes = JSON.parse(fs.readFileSync('classes.json', 'utf8'));
var cnn_model;

module.exports = {

    // Renvoie un buffer d'image 28x28 à partir des données d'un dessin
    process: async function(data) {
        // Reconstruction de l'image matricielle pour traitement
        var h = 420;
        const canvas = createCanvas(h, h);
        const ctx = canvas.getContext('2d');

        ctx.lineWidth = 10.0;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, h, h);

        for (var i = 0; i < data.length; i++) {
            if (data[i].length > 1) {
                var line = data[i];
                for (var j = 0; j < line.length - 1; j++) {
                    ctx.beginPath();
                    ctx.moveTo(line[j][0], line[j][1]);
                    ctx.lineTo(line[j+1][0], line[j+1][1]);
                    ctx.closePath();
                    ctx.stroke();
                }
            }
        }
        
        // Découpage de l'image
        var imageData = ctx.getImageData(0, 0, h, h);
        var data_img = imageData.data;
        var dt = [];
        for (var i = 0; i < data_img.length; i+=4) {
            dt.push(data_img[i]);
        }

        var ret = new Array(h);
        for (var i = 0; i < h; i++) {
            ret[i] = new Array(h);
            for (var j = 0; j < h; j++) {
                ret[i][j] = dt[i*h + j];
            }
        }

        var minX = h;
        var minY = h;
        var maxX = 0;
        var maxY = 0;

        for (var i = 0; i < h; i++) {
            for (var j = 0; j < h; j++) {
                if (ret[i][j] != 255) {
                    minX = Math.min(minX, j);
                    maxX = Math.max(maxX, j);
                    minY = Math.min(minY, i);
                    maxY = Math.max(maxY, i);
                }
            }
        }

        var width = maxX - minX;
        var height = maxY - minY;

        if (width <= 0 || height <= 0) return null;

        var imgData = ctx.getImageData(minX, minY, width, height);
        const new_canvas = createCanvas(width, height);
        const new_ctx = new_canvas.getContext('2d');
        new_ctx.putImageData(imgData, 0, 0);
        
        // Redimensionnement de l'image

        var top_b;
        var bottom_b;
        var left_b;
        var right_b;
        var bord = Math.abs(width - height) / 2;
        var bord2 = bord;

        if (bord % 1 != 0) {
            bord = Math.floor(bord);
            bord2 = bord + 1;
        }
        if (width > height) {
            top_b = bord;
            bottom_b = bord2;
            left_b = 0;
            right_b = 0;
        } else {
            top_b = 0;
            bottom_b = 0;
            left_b = bord;
            right_b = bord2;
        }

        var buffer = new_canvas.toBuffer();
        var marginSize = 10;

        buff = await sharp(buffer)
                        .extend({
                            top: top_b + marginSize,
                            bottom: bottom_b + marginSize,
                            left: left_b + marginSize,
                            right: right_b + marginSize,
                            background: 'white'
                        }).toBuffer()
        
        return await sharp(buff).resize(28, 28).toBuffer();
    },

    // Créer un fichier image à partir d'un buffer et renvoie le filename
    bufferToPng: function(buffer, filename) {
        fs.writeFileSync(filename, buffer);
        return '/' + filename;
    },

    // Renvoie un tenseur à partir d'un buffer d'image
    bufferToTensor: async function(buffer) {
        
        if (buffer == null) return null;

        var fln = 'temp' + Math.floor(Math.random() * 9999999) + '.png';
        fs.writeFileSync(fln, buffer);
        var img = await loadImage(fln);
        fs.unlinkSync(fln);
        
        var fcanvas = createCanvas(28, 28);
        var fctx = fcanvas.getContext('2d');
        fctx.drawImage(img, 0, 0);
        var raw_pixels = fctx.getImageData(0, 0, 28, 28).data;

        var dt = [];
        for (var i = 0; i < raw_pixels.length; i+=4) {
            dt.push(raw_pixels[i]);
        }
        
        ret = new Array(28);
        for (var i = 0; i < 28; i++) {
            ret[i] = new Array(28);
            for (var j = 0; j < 28; j++) {
                ret[i][j] = new Float32Array(1);
                ret[i][j][0] = 1 - (dt[i*28 + j] / 255);
            }
        }
        return tf.tensor([ret]);
    },

    // Affiche un tenseur avec des details
    printTensor: function(arr) {
        console.log('----------------------------------------------');
        console.log(tf.tensor(arr).mean().dataSync());
        console.log(tf.moments(arr).variance.sqrt().dataSync());
        console.log('----------------------------------------------');
        for (var i = 0; i < 28; i++) {
            var line = '';
            for (var j = 0; j < 28; j++) {
                line += arr[i][j][0].toFixed(2) + " ";
            }
            console.log(line);
        }
        console.log('----------------------------------------------');
    },

    // Renvoie une prediction à partir d'un tenseur
    predict: async function(tensor) {
        if (tensor == null) return null;

        var pred = await cnn_model.predict(tensor).dataSync();
        var arr = new Array(classes.length);

        for (let i = 0; i < classes.length; i++) {
            arr[i] = new Array(2);
            arr[i][0] = classes[i];
            arr[i][1] = pred[i];
        }

        arr.sort((a, b) => b[1] - a[1]);
        return arr;
    },

    // Renvoie une liste de prédiction à partir d'une liste de données de dessins
    predictDrawings: async function(datas) {

        var buffers = new Array(datas.length);
        for (i in datas) {
            buffers[i] = this.process(datas[i])
        }

        var b = await Promise.all(buffers);
        var tensors = new Array(b.length);
        for (i in b) {
            tensors[i] = this.bufferToTensor(b[i]);
        }
        
        var t = await Promise.all(tensors);
        var results = new Array(t.length)
        for (k in t) {
            if (t[k] == null) {
                results[k] = null;
            } else {
                results[k] = cnn_model.predict(t[k]).dataSync();
            }
        }
        return Promise.all(results);
    },

    load: async function() {
        cnn_model = await tf.loadLayersModel('file://' + __dirname + '/cnn_model/model.json');
    },

    getScore: function(pred, word) {
        if (pred == null) {
            return 0;
        }

        var arr = new Array(classes.length);
        for (i in pred) {
            arr[i] = new Array(2);
            arr[i][0] = classes[i];
            arr[i][1] = pred[i];
        }
        arr.sort((a, b) => b[1] - a[1]);


        var position;
        for (i in pred) {
            if (arr[i][0] == word) {
                position = parseInt(i);
                break;
            }
        }

        var score = 0;
        switch (position) {
            case 0:
                score += 100;
                break;
            case 1:
                score += 50;
                break;
            case 2:
                score += 25;
                break;
        }
        score += Math.floor(arr[position][1] * 100);
        return score;
    }
}
