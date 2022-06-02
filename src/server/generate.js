const fs = require('fs');
const nj = require('numjs');
const { createCanvas, loadImage } = require('canvas');
const cliProgress = require('cli-progress');
eval(fs.readFileSync('sketch_rnn.js') + '');

var classes = JSON.parse(fs.readFileSync('classes.json', 'utf8'));
var models = new Array(classes.length);

module.exports = {
    
    // Génération d'une image sous forme PNG en fonction de la classe donnée, renvoie le nom du fichier.
    generate_png: function(c) {
        var model_index = classes.indexOf(c);
        if (c == 'random') {
            model_index = Math.floor(Math.random() * classes.length);    
        }
        if (model_index == -1) {
            return null;
        }

        var height = 420;
        var scaling = 150 + Math.floor(Math.random() * 150);
        var max = (height - scaling) / 3;
        var randomOffsetX = -max + Math.random() * max * 2;
        var randomOffsetY = -max + Math.random() * max * 2;

        var model = models[model_index];
        var drawing = model.generate(0.1);
        drawing = model.scale_drawing(drawing, scaling);
        drawing = model.center_drawing(drawing);
        
        var x = (height / 2) + randomOffsetX, y = (height / 2) + randomOffsetY;
        var dx, dy;
        var pen_down, pen_up, pen_end;
        var prev_pen = [0, 1, 0];
        
        const canvas = createCanvas(height, height);
        const context = canvas.getContext('2d');

        context.fillStyle = 'white';
        context.fillRect(0, 0, height, height);
        context.strokeStyle = 'black'
        context.strokeWeight

        for (var i = 0; i < drawing.length; i++) {
            [dx, dy, pen_down, pen_up, pen_end] = drawing[i];
            if (prev_pen[2] == 1) {
                break;
            }
            if (prev_pen[0] == 1) {
                context.lineWidth = 2.0;
                context.beginPath();
                context.moveTo(x, y);
                context.lineTo(x+dx, y+dy);
                context.closePath();
                context.stroke();
            }
            x += dx;
            y += dy;
            prev_pen = [pen_down, pen_up, pen_end];
        }
        
        const buffer = canvas.toBuffer('image/png');
        var now = new Date();
        var filename = 'generated/' +
                        (now.getMonth() + 1).toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) +
                        now.getUTCDate().toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) + '_' +
                        now.getHours().toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) +
                        now.getMinutes().toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) + 
                        now.getSeconds().toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) + '_' +
                        classes[model_index] + '.png';
        
        fs.writeFileSync(filename, buffer);
        return filename;
    },

    // Génération d'une image sous forme de coordonées, renvoie un tableau des coordonées
    genData: function(c) {
        var model_index = classes.indexOf(c);
        if (model_index == -1) {
            return null;
        }

        var height = 420;
        var scaling = 150 + Math.floor(Math.random() * 150);
        var max = (height - scaling) / 3;
        var randomOffsetX = -max + Math.random() * max * 2;
        var randomOffsetY = -max + Math.random() * max * 2;

        var model = models[model_index];
        var drawing = model.generate(0.1);
        drawing = model.scale_drawing(drawing, scaling);
        drawing = model.center_drawing(drawing);
        return [randomOffsetX, randomOffsetY, drawing];
    },

    // Chargement des modèles pour chaque classe
    load: function() {
        var bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        var progress = 0;
        
        console.log(' Loading sketch-rnn models :\n');
        bar.start(classes.length, progress);

        for (const c in classes) {
            eval(fs.readFileSync('sketch_rnn_model_data/' + classes[c] + '.js') + '');
            models[c] = new SketchRNN(JSON.parse(eval(classes[c] + '_model_data')));
            bar.update(++progress);
        }
    }
 }