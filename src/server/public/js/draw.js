// Vérification de l'accès
if (sessionStorage.getItem('drawReady') != 'yes') {
    window.location.href = '/join?error=Join a room to draw.';
}
sessionStorage.removeItem('drawReady');

var socket = io();
var room = sessionStorage.getItem('room');
socket.emit('classRequest', room);
socket.on('classAnswer', answer => {
    answer = answer.charAt(0).toUpperCase() + answer.slice(1);
    document.getElementById('class').innerHTML = answer;

    // Supression du loading et affichage de la carte
    var loading = document.getElementById('waiting');
    loading.remove();
    var panel = document.getElementById('main');
    panel.hidden = false;
    // Timer
    var timer = document.getElementById('timer');
    var i = 9;
    function decrease() {
        if (i == 0) {
            // Traitement des données, et envoie au serveur
            clearInterval(inter);
            for (var j = 0; j < data.length; j++) {
                if (data[j].length == 0) {
                    data.splice(j, 1);
                } else if (data[j].length == 1 && data[j][0] == undefined) {
                    data.splice(j, 1);   
                }
            }
            socket.emit('draw', room, sessionStorage.getItem('username'), data);

            var waiting = document.createElement('div');
            waiting.innerHTML = '<div class="text-center" style="margin-top:400px;"><div style="width: 5rem; height: 5rem;" class="spinner-grow text-warning" role="status"></div></div>';        
            main.parentNode.replaceChild(waiting, main);
            return;
        }
        timer.innerHTML =  i + ' sec';
        i--;
    }
    var inter = setInterval(decrease, 1000);


    // Setup du canvas 
    var canvas = document.getElementById('draw_panel');
    canvas.width = 420;
    canvas.height = 420;

    var ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 420, 420);
    ctx.lineWidth = 2.0;

    var canvasOffsetX = canvas.getBoundingClientRect().left + window.scrollX;
    var canvasOffsetY = canvas.getBoundingClientRect().top + window.scrollX;

    window.onresize = function window_resize() {
        canvasOffsetX = canvas.getBoundingClientRect().left + window.scrollX;
        canvasOffsetY = canvas.getBoundingClientRect().top + window.scrollX;
    }

    // Gestion du dessin
    let isPainting = false;
    var data = [[]];

    canvas.addEventListener('mousedown', (e) => {
        isPainting = true;
    });

    canvas.addEventListener('mouseup', e => {
        isPainting = false;
        data[data.length - 1] = simplify_line(data[data.length - 1]);
        data.push([]);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isPainting) return;
        data[data.length - 1].push([e.clientX - canvasOffsetX, e.clientY - canvasOffsetY]);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 420, 420);
        draw_line_data(data);
    });

    function draw_line_data(data) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 420, 420);

        for (var i = 0; i < data.length; i++) {
            if (data[i].length > 1) {
                var line;
                if (i == data.length - 1) {
                    line = simplify_line(data[i]);
                } else {
                    line = data[i];
                }
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

    function simplify_line(V) {
        var tol = 1.0;
        var diff = function(u, v) {return [u[0]-v[0], u[1]-v[1]]}
        var dot = function(u, v) {return u[0]*v[0] + u[1]*v[1]}
        var norm2 = function(v) {return v[0]*v[0] + v[1]*v[1]}
        var d2 = function(u, v) {return norm2(diff(u,v))}
        var rec = function(tol, v, j, k, mk) {

            if (k <= j+1) {
                return;
            }
            var maxi = j;
            var maxd2 = 0;
            var tol2 = tol * tol;
            var S = [v[j], v[k]];
            var u = diff(S[1], S[0]);
            var cu = norm2(u,u);
            
            var w;
            var Pb;
            var b, cw, dv2;
            for (var i = j + 1; i < k; i++) {
                w = diff(v[i], S[0]);
                cw = dot(w,u);
                if (cw <= 0) {
                    dv2 = d2(v[i], S[0]);
                } else if (cu <= cw) {
                    dv2 = d2(v[i], S[1]);
                } else {
                    b = cw / cu;
                    Pb = [S[0][0]+b*u[0], S[0][1]+b*u[1]];
                    dv2 = d2(v[i], Pb);
                }
                if (dv2 <= maxd2) {
                    continue;
                }
                maxi = i;
                maxd2 = dv2;
            }
            if (maxd2 > tol2) {
                mk[maxi] = 1;
                rec(tol, v, j, maxi, mk);
                rec(tol, v, maxi, k, mk);
            }
            return;
        }

        var n = V.length;
        var sV = [];
        var i, k, m, pv;
        var tol2 = tol * tol;
        var vt = [];
        var mk = [];

        vt[0] = V[0];
        for (i = k = 1, pv = 0; i < n; i++) {
            if (d2(V[i], V[pv]) < tol2) {
                continue;
            }
            vt[k++] = V[i];
            pv = i;
        }
        if (pv < n-1) {
        vt[k++] = V[n-1];
        }

        mk[0] = mk[k-1] = 1;
        rec(tol, vt, 0, k-1, mk);

        for (i = m = 0; i<k; i++) {
            if (mk[i]) {
                sV[m++] = vt[i];
            }
        }
        return sV;
    }

    // Bouton Erase
    var erase = document.getElementById('erase');
    erase.addEventListener('click', e => {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 420, 420);
        data = [[]];
    });

    // Redirection quand process terminé
    socket.on('guess', () => {
        window.location.href = '/guess';
        sessionStorage.setItem('guessReady', 'yes');
    });

});