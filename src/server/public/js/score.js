if (sessionStorage.getItem('scoreReady') != 'yes') {
    window.location.href = '/join?error=Please join a room to play.';    
} else {

    sessionStorage.removeItem('scoreReady');

    // Requête des score au serveur 
    var socket = io();
    var room = sessionStorage.getItem('room');
    var data;
    socket.emit('scoreRequest', room, sessionStorage.getItem('username'));
    // Reception des scores et remplissage de la page
    socket.on('scores', (players, data_drawing, guess_scores, pred_scores) => {

        // Construction et tri des données de classements
        data = new Array();
        for (i in players) {
            data[i] = new Array(5);
            data[i][0] = players[i];
            data[i][1] = guess_scores[i];
            data[i][2] = pred_scores[i];
            data[i][3] = data[i][1] + data[i][2];
        }
        data.sort((a, b) => b[3] - a[3]);
        for (i in data) {
            data[i][4] = parseInt(i) + 1;
        }    
        
        // Construction du tableau de score
        for (i in data) {
            var tbody = document.getElementById('tbody');
            var tr = document.createElement('tr');

            var pos = '<tr><th scope="row">';
            if (i == 0) {
                pos += '<span style="font-size: 1.2em;">🥇</span>';
            } else if (i == 1) {
                pos += '<span style="font-size: 1.2em;">🥈</span>';
            } else if (i == 2){
                pos += '<span style="font-size: 1.2em;">🥉</span>';
            } else {
                pos += data[i][4];
            }
            pos += '</th>';

            var text = pos +
            '    <td>' + data[i][0] +'</td>' +
            '    <td>' + data[i][2] +'</td>' +
            '    <td>' + data[i][1] +'</td>' +
            '    <td>' + data[i][3] +'</td></tr>';

            tr.innerHTML = text;
            tbody.appendChild(tr);
        }

        // Ajout des indicateurs du caroussel
        var indic = document.getElementById('indic');
        text = '';
        for (i in data) {  
            if (i == 0) {
                text += '<button type="button" data-bs-target="#carouselExampleCaptions" data-bs-slide-to="0" class="active" aria-current="true" aria-label=""></button>';
            } else {
                text +='<button type="button" data-bs-target="#carouselExampleCaptions" data-bs-slide-to="' + i + '" aria-label=""></button>'
            }
        }
        indic.innerHTML = text;
        
        // Construction du carousel
        var carousel = document.getElementById('carousel');
        text = '';
        for (i in data) {
            if (i == 0) {
                text += '<div class="carousel-item active">';
            } else {
                text += '<div class="carousel-item">';
            }
            text +='<canvas id="canvas' + i + '" class="d-block w-100"></canvas>';
            text +='<div class="carousel-caption d-none d-md-block"><h5>' + players[i] +'</h5></div></div>';   
        }
        carousel.innerHTML = text;

        // Dessin sur les canvas
        for (i in data) {
            var canvas = document.getElementById('canvas' + i);
            canvas.width = 420;
            canvas.height = 420;

            var ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, 420, 420);
            
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2.0;

            for (var k = 0; k < data_drawing[i].length; k++) {
                var line;
                line = data_drawing[i][k];
                for (var j = 0; j < line.length - 1; j++) {
                    ctx.beginPath();
                    ctx.moveTo(line[j][0], line[j][1]);
                    ctx.lineTo(line[j+1][0], line[j+1][1]);
                    ctx.closePath();
                    ctx.stroke();
                }
            }
        }
        
        // Bouton Check drawings
        var check = document.getElementById('check');
        var carou = document.getElementById('carrousel_div');
        var carou_hide = false;
        check.addEventListener('click', (event) => {
            carou.hidden = carou_hide;
            carou_hide = !carou_hide;
        });

        // Bouton Play Again
        document.getElementById('replay').addEventListener('click', (event) => {
            window.location.href = '/room/' + room;    
        });

        // Titre
        document.getElementById('title').innerHTML = "Score - Room " + room;

        // Supression du chargement et affichage du classement
        var loading = document.getElementById('waiting');
        loading.remove();
        var panel = document.getElementById('score_div');
        panel.hidden = false;

        sessionStorage.setItem('joined', room);
    });
}

