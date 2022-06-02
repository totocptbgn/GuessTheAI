// Gestion des messages d'erreur
var url = new URL(window.location.href);
var error = url.searchParams.get("error");

if (error != null) {
    var div = document.getElementById("error");

    var msg = "";
    msg += '<div class="alert col-3" style="border-radius: 20px; background-color:rgb(255, 255, 255);" role="alert" id="alert">';
    msg += '<small style="font-size:110%;">⚠️ ' + error;
    msg += '</small></div>'
    div.innerHTML = msg;
    var alertdiv = document.getElementById('alert');
    alertdiv.addEventListener('click', event => {
        alertdiv.remove();
    });
}

// Supression de toute la sessionStorage
sessionStorage.clear();

// On vérifie que le username est correct
function checkUsername() {
    var usernameRegex = /^[a-zA-Z]+$/;
    return usernameRegex.test(username_input.value);
}

// Bouton Create Room
var create = document.getElementById('create');
var username_input = document.getElementById('username_input');
create.addEventListener('click', event => {
    if (checkUsername()) {
        // On stocke l'username et on confirme notre passage par /join 
        sessionStorage.setItem('username', username_input.value)
        sessionStorage.setItem('joined', 'yes');
        // On est redirigé vers /create/room
        window.location.href = '/create/room';
    } else {
        window.location.href = '/join?error=Please pick a correct username.';
    }
});

// Bouton Join Room
var join = document.getElementById('join');
join.addEventListener('click', event => {
    if (checkUsername()) {
        // On stocke l'username et on confirme notre passage par /join 
        var room_code = document.getElementById('room_code');
        sessionStorage.setItem('username', username_input.value)
        sessionStorage.setItem('joined', 'yes');
        // On est redirigé vers /create/room
        window.location.href = '/room/' + room_code.value;
    } else {
        window.location.href = '/join?error=Please pick a correct username.';
    }
});

if (error != null) {
    window.history.pushState('', '', '/join');
}