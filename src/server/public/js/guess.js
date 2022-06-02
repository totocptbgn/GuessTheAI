if (sessionStorage.getItem('guessReady') != 'yes') {
    window.location.href = '/join?error=Please join a room to play.';    
} else {

    sessionStorage.removeItem('guessReady');
    var socket = io();
    var room = sessionStorage.getItem('room');
    socket.emit('roomdata', room);
    var permut;

    var submit = document.getElementById('submit');
    submit.disabled = true;

    var username = sessionStorage.getItem('username');

    // Fonction pour dessiner sur un certain canvas
    function draw_canvas(canvas_id, data_draw) {

        var canvas = document.getElementById('cnvs' + canvas_id);
        canvas.width = 420;
        canvas.height = 420;

        var ctx = canvas.getContext('2d');

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 420, 420);
        
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2.0;

        if (data_draw.length != 0) {
            
            if (data_draw[0].length == undefined) {
                var x = 200 + data_draw[0], y = 200 + data_draw[1];
                var drawing = data_draw[2];
                var dx, dy;
                var pen_down, pen_up, pen_end;
                var prev_pen = [0, 1, 0];
    
                for (var i = 0; i < drawing.length; i++) {
                    [dx, dy, pen_down, pen_up, pen_end] = drawing[i];
                    if (prev_pen[2] == 1) {
                        break;
                    }
                    if (prev_pen[0] == 1) {
                        ctx.lineWidth = 2.0;
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.lineTo(x+dx, y+dy);
                        ctx.closePath();
                        ctx.stroke();
                    }
                    x += dx;
                    y += dy;
                    prev_pen = [pen_down, pen_up, pen_end];
                }
    
            } else {
                for (var i = 0; i < data_draw.length; i++) {
                    var line;
                    line = data_draw[i];
                    for (var j = 0; j < line.length - 1; j++) {
                        ctx.beginPath();
                        ctx.moveTo(line[j][0], line[j][1]);
                        ctx.lineTo(line[j+1][0], line[j+1][1]);
                        ctx.closePath();
                        ctx.stroke();
                    }
                }
            }
        }
    }

    // Contruction de la carte
    socket.on('guessAnswer', (players, data, data_ai) => {

        var self_index = players.indexOf(username);
        players.splice(self_index, 1);
        data.splice(self_index, 1);

        // Construction de la permut
        permut = [...Array(players.length + data_ai.length).keys()];;
        for (let i = permut.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [permut[i], permut[j]] = [permut[j], permut[i]];
        }

        document.getElementById('bnai').innerHTML = data_ai.length;
        
        // Supression du loading et affichage de la carte
        var waiting = document.getElementById('waiting');
        waiting.hidden = true;
        var panel = document.getElementById('panel');
        panel.hidden = false;
        
        // Contruction des canvas et des select pour chaque dessin dans la carte
        var cont = document.getElementById('cont');
        for (let i = 0; i < permut.length; i++) {
            var div = document.createElement('div');
            var inn = "";
            inn += '<canvas id="cnvs' + i + '" class="card" style="border-style: solid; border-width: 1px; width: 420px; height: 420px; margin-left: auto; margin-right: auto; margin-bottom: 20px; margin-top: 20px;padding-left: 0px; padding-right: 0px;"></canvas>';
            inn += '<select id="slct' + i + '"style="width: 60%; margin-left: auto; margin-right: auto; margin-top: 5px; margin-bottom: 10px;" class="form-select form-select-sm" aria-label=".form-select-sm example">';    
            inn += '</select>';
            inn += '<hr style="margin-top: 30px;margin-bottom: 30px;">';
            div.innerHTML = inn;
            cont.appendChild(div)
        }
        
        // Affichage des dessins dans les canvas en respectant la permutation
        for (i in permut) {
            var index = permut[i];
            if (index < data.length) {
                draw_canvas(i, data[index])
            } else {
                draw_canvas(i, data_ai[index - data.length])
            }
        }
        
        // Création des options
        var options = [' --- '];
        for (let j = 0; j < players.length; j++) {
            if (players[j] != username) {
                options.push(players[j]);
            }
        }
        options.push('AI');

        // Ajout des options
        for (i in permut) {
            var select = document.getElementById('slct' + i);
            
            if (players[permut[i]] == username) {
                select.disabled = true;
                var opt = document.createElement("option");
                opt.text = username;
                select.add(opt, null);
                select.selectedIndex = 0;
            } else {
                for (j in options) {
                    var opt = document.createElement("option");
                    opt.text = options[j];
                    select.add(opt, null);
                }
            }
        }
        
        // Gestion des options changeantes
        const countOccurrences = (arr, val) => arr.reduce((a, v) => (v === val ? a + 1 : a), 0);
        function update_submit() {
            // Récuperation des valeurs des selects
            var selected_values = [];
            for (i in permut) {
                var select = document.getElementById('slct' + i);
                selected_values.push(select.selectedIndex);
            }

            // Si on a le bon nombre d'IA
            if (countOccurrences(selected_values, (data.length + 1)) == data_ai.length) {
                var dis = false;
                // Vérifie que chaque joueur est aussi sélectionné
                for (i in players) {
                    if (countOccurrences(selected_values, parseInt(i) + 1) != 1) {
                        dis = true;
                        break;
                    }
                }   
                submit.disabled = dis;
            } else {
                submit.disabled = true;
            }

            // Sinon on affiche la liste des joueurs non sélectionnés.
            if (submit.disabled) {
                var forgotten_people = [];
                for (let i = 0; i < data.length; i++) {
                    if (selected_values.indexOf(i + 1) == -1) {
                        forgotten_people.push(players[i]);
                    }
                }
            
                var forgot = '';
                var forgot_ai = data_ai.length - countOccurrences(selected_values, (data.length + 1));
                if (forgot_ai > 0) {
                    forgot = 'You forgot ' + forgot_ai + ' AI';
                    if (forgot_ai != 1) {
                        forgot += 's';
                    }
                    if (forgotten_people.length != 0) {
                        forgot += " and ";
                    }
                } else {
                    if (forgotten_people.length != 0) {
                        forgot += "You forgot ";
                    }
                }
                
                if (forgotten_people.length != 0) {
                    if (forgotten_people.length > 1) {
                        forgot += "some people : ";
                    }
                    for (i in forgotten_people) {
                        forgot += forgotten_people[i] + ', ';
                    }
                    forgot = forgot.slice(0, -2);
                    forgot += '.';
                    
                } else {
                    forgot += '.';
                }
                document.getElementById('forgot').innerHTML = forgot;

            } else {
                document.getElementById('forgot').innerHTML = ''
            }
            
        }

        for (i in permut) {
            document.getElementById('slct' + i).addEventListener('change', (event) => {
                update_submit();
            });
        }

        // Gestion du submit
        submit.addEventListener('click', (event) => {
            var selected_values = [];
            for (i in permut) {
                var select = document.getElementById('slct' + i);
                selected_values.push(select.selectedIndex);
            }
            
            var selected = [];
            for (i in selected_values) {
                selected.push(options[selected_values[i]]);
            }

            var a = players.slice();
            for (let i = 0; i < data_ai.length; i++) {
                a.push('AI');
            }
            var answer = [];
            for (i in a) {
                answer[i] = a[permut[i]];
            }

            var score = 0;
            for (i in selected) {
                if (selected[i] == 'AI') {
                    if (answer[i] == 'AI') {
                        score += 50;
                    }
                } else {
                    if (answer[i] == 'AI') {
                        score -= 300;
                    } else if (selected[i] == answer[i]) {
                        score += 100;
                    }
                }
            }
            socket.emit('score', room, username, score);

            waiting.hidden = false;
            panel.hidden = true;

            // Redirection quand process terminé
            socket.on('scoreReady', () => {
                window.location.href = '/score';
                sessionStorage.setItem('scoreReady', 'yes');
            });

        });
    });
}