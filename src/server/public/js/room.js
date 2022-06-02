const limit_size = 7;
const limit_ia = 7;
var charged = false;

function roomFun() {
    // Check si on est bien passé par /join
    var room = window.location.href.split('/')[4];
    console.log(sessionStorage);
    if (sessionStorage.getItem('joined') != 'yes' && sessionStorage.getItem('joined') != room) {
        window.location.href = '/join?error=Please join a room from /join.';
        return;
    }
    sessionStorage.removeItem('joined');

    // On récupère le pseudo dans le sessionStrorage et le numéro de room dans l'url
    var username = sessionStorage.getItem('username');
    if (username == 'AI') {
        window.location.href = '/join?error=This username is not available.';
        return;
    }

    document.title = "Room - " + room;
    sessionStorage.setItem('room', room);

    // On désactive le bouton pour lancer et le select
    var select = document.getElementById('nbai');
    for (let i = 2; i < limit_ia + 1; i++) {
        var opt = document.createElement("option");
        opt.value = i.toString();
        opt.text = i;
        select.add(opt, null);
    }
    select.hidden = true;

    var start = document.getElementById('start');
    start.disabled = true;
    start.addEventListener('click', event => {
        if (select.value == "Nb of AI") {
            socket.emit('startGame', room, 2);
        } else {
            socket.emit('startGame', room, select.value);
        }
    });

    // Copie du code de la room dans le presse-papier quand on clique sur le bouton
    const button = document.getElementById('copy')
    button.onclick = () => {
        navigator.clipboard.writeText(room);
    }

    // Connection par socket au serveur et inscription à la room
    var socket = io();
    socket.emit('roomConnect', username, room);
    socket.on('roomValid', (dupl_name, len) => {
        if (len == limit_size) {
            window.location.href = '/join?error=This room is full.';
            return;
        }
        if (dupl_name) {
            window.location.href = '/join?error=This username is not available.';
            return;
        }       
    });

    // Affichage sur username et du numéro de room
    const text = document.getElementById('text');
    text.innerHTML = 'Room - ' + room;

    // Mise à jour de la liste des joueur quand on recoit un emission 'update' du socket
    const connected = document.getElementById('connected');
    socket.on('update', function(list) {

        if (!charged) {
            charged = true;
            document.getElementById('waiting').remove();
            document.getElementById('card').hidden = false;
        }

        connected.innerHTML = "";
        for (user in list) {
            var u = "";
            if (list[user] == username) {
                u +='<li class="list-group-item d-flex justify-content-between align-items-center">';
                u += list[user];
                u += '<span class="badge badge-primary badge-pill" style="color: #fff; background-color: #fcb714;">Me</span>'
            } else {
                u += '<li class="list-group-item">';
                u += list[user];
            }

            u += "</li>";
            connected.innerHTML += u;
        }

        // On active le bouton pour lancer la partie si on est le premier joueur
        if (list[0] == username) {
            select.hidden = false;
            if (list.length > 1 && list.length < limit_size + 1) {
                start.disabled = false;
            }
        }
    });
    

    socket.on('startGame', () => {
        window.location.href = '/draw';
        return;
    });

    sessionStorage.setItem('drawReady', 'yes');
}

roomFun();