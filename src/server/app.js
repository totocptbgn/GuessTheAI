const express = require('express');
const app = express();
const port = 3000;
app.use(express.static('public'));

const { Server } = require("socket.io");
var https = require('https');
const fs = require('fs');

const key = fs.readFileSync('key/key.pem');
const cert = fs.readFileSync('key/cert.pem');
const server = https.createServer({key: key, cert: cert }, app);

const io = new Server(server);
const colors = require('colors');

const generate = require('./generate.js');
console.clear();
consoleTitle();
generate.load();
const img = require('./img_processing.js');
img.load();

var classes = JSON.parse(fs.readFileSync('classes.json', 'utf8'));

const game_state = new Object();

console.clear();
consoleTitle();
server.listen(port, () => {
    
    // Affichage de la redirection de ngrok si activé.
    require('child_process').exec('curl -s localhost:4040/api/tunnels', (error, stdout, stderr) => {
        log_message('Listening at ' + 'https://localhost:3000'.green);
        if (stdout) {
            var tunnels = JSON.parse(stdout)['tunnels'];
            for (i in tunnels) {
                if (tunnels[i]['proto'] == "https") {
                    log_message('Public tunel at ' +  tunnels[i]['public_url'].green);
                }
                break;
            }
        }
    });
});

// -- Fonctions

// Fonction de log personnalisée
async function log_message(message) {
    var date = new Date();
    console.log('[' + date.getHours().toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) 
                + ':' + date.getMinutes().toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})
                + ':' + date.getSeconds().toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false})
                + '] ' + message);
}

// Gestion de la deconnection des utilisateur dans un salon en attente
function disconnect_user(socket) {
    for (room in game_state) {
        if (game_state[room]['status'] == 'waiting') {
            for (user in game_state[room]['users']) {
                if (game_state[room]['users'][user]['socket'].id == socket.id) {
                    log_message(user + ' disconnected from room ' + room.red + '.');
                    delete game_state[room]['users'][user];
                    update_player_list(room);
                    if (Object.keys(game_state[room]['users']).length == 0) {
                        delete game_state[room];
                        log_message('Room ' + room.red + ' was deleted.');
                    }
                    return;
                }
            }
        }
    }
}

// Envoie de la liste des joueurs du salon aux joueurs d'un salon
function update_player_list(room) {
    var username_list = [];
    for (user in game_state[room]['users']) {
        username_list.push(user);
    }
    for (user in game_state[room]['users']) {
        game_state[room]['users'][user]['socket'].emit('update', username_list)
    }
}

// Gestion du lancement de la partie pour une room
function startGame(room, nb_ai) {
    for (user in game_state[room]['users']) {
        game_state[room]['users'][user]['socket'].emit('startGame');
        delete game_state[room]['users'][user]['socket'];
    }
    game_state[room]['status'] = 'drawing';
    game_state[room]['nb_ai'] = nb_ai;
    game_state[room]['check'] = setInterval(checkRoom, 600000, room);
}

// Pour créer ou reinitialisé  une room
function initRoom(room) {
    if (game_state[room] == undefined) {
        log_message('New room created with id: ' + room.toString().red + '.');
    } else {
        log_message('Reinitialising room ' + room.toString().red + '.');
    }
    game_state[room] = new Object();
    game_state[room]["users"] = new Object();
    game_state[room]["status"] = "waiting";
    game_state[room]["word"] = classes[Math.floor(Math.random() * classes.length)];
    return room;
}

// Retire une room inactive du game state si une room dure plus de 10 minutes
function checkRoom(room) {
    if (game_state[room] != undefined) {
        log_message('Deleting ' + room.red + ' because of inactivity.');
        clearInterval(game_state[room]['check']);
        delete game_state[room];
    }
}

function consoleTitle() {                                                                                                                            
    var ascii = ["+-----------------------------------------------------------------------------------------------------------------------------------------------+",
    "|                                                                                                                                               |",
    "|                                                                                                                                               |",
    "|           .g8\"\"\"bgd `7MMF'   `7MF'`7MM\"\"\"YMM   .M\"\"\"bgd  .M\"\"\"bgd     MMP\"\"MM\"\"YMM `7MMF'  `7MMF'`7MM\"\"\"YMM            db      `7MMF'         |",
    "|         .dP'     `M   MM       M    MM    `7  ,MI    \"Y ,MI    \"Y     P'   MM   `7   MM      MM    MM    `7           ;MM:       MM           |",
    "|         dM'       `   MM       M    MM   d    `MMb.     `MMb.              MM        MM      MM    MM   d            ,V^MM.      MM           |",
    "|         MM            MM       M    MMmmMM      `YMMNq.   `YMMNq.          MM        MMmmmmmmMM    MMmmMM           ,M  `MM      MM           |",
    "|         MM.    `7MMF' MM       M    MM   Y  , .     `MM .     `MM          MM        MM      MM    MM   Y  ,        AbmmmqMA     MM           |",
    "|         `Mb.     MM   YM.     ,M    MM     ,M Mb     dM Mb     dM          MM        MM      MM    MM     ,M       A'     VML    MM           |",
    "|           `\"bmmmdPY    `bmmmmd\"'  .JMMmmmmMMM P\"Ybmmd\"  P\"Ybmmd\"         .JMML.    .JMML.  .JMML..JMMmmmmMMM     .AMA.   .AMMA..JMML.         |",
    "|                                                                                                                                               |",
    "|         Projet Long : Master I.                                                                                                               |",
    "|         ° Thomas Bignon.                                                                                                                      |",
    "|         ° Laura Wang.                                                                                                                         |",
    "|                                                                                                                                               |",
    "|                                                                                                                                               |",
    "+-----------------------------------------------------------------------------------------------------------------------------------------------+"];
    for (i in ascii) {
        console.log(ascii[i]);
    }
    console.log();
}

// -- Routing

app.get('/', (req, res) => {
    res.sendFile(__dirname+'/public/html/index.html');
    log_message('GET ' + '/'.yellow);
});

app.get('/join', (req, res) => {
    res.sendFile(__dirname+'/public/html/join.html');
    log_message('GET ' + '/join'.yellow);
});

app.get('/create/room', (req, res) => {
    log_message('GET ' + '/create/room'.yellow);
    var newRoom;
    do {
        newRoom = Math.floor(Math.random() * 9999);
    } while (game_state[newRoom] != undefined);
    initRoom(newRoom);
    res.redirect('/room/' + newRoom);
});

app.get('/room/:roomID', (req, res) => {
    log_message('GET ' + '/room/'.yellow + req.params['roomID'].yellow);
    if (game_state[req.params['roomID']] == undefined) {
        res.redirect("/join?error=Room doesn't exist.");
    } else {
        res.sendFile(__dirname + '/public/html/room.html');
    }
});

app.get('/show', (req, res) => {
    log_message('GET ' + '/show'.yellow);
    console.log('[--:--:--] ============================================================');
    for (room in game_state) {
        log_message('Room ' + room.red);
        console.log(game_state[room]);
    }
    console.log('[--:--:--] ============================================================');
    res.send();
});

app.get('/draw', (req, res) => {
    log_message('GET ' + '/draw'.yellow);
    res.sendFile(__dirname+'/public/html/draw.html');
});

app.get('/generate/:animal', (req, res) => {
    log_message('GET ' + '/generate/'.yellow + req.params['animal'].yellow);
    var ret = generate.generate_png(req.params['animal']);
    if (ret != null) {
        res.sendFile(__dirname + '/' + ret);
    } else {
        res.send('Class requested not found.');
    }
});

app.get('/guess', (req, res) => {
    log_message('GET ' + '/guess'.yellow);
    res.sendFile(__dirname+'/public/html/guess.html');
});

app.get('/score', (req, res) => {
    log_message('GET ' + '/score'.yellow);
    res.sendFile(__dirname+'/public/html/score.html');
});

app.get('/predict', (req, res) => {
    log_message('GET ' + '/predict'.yellow);
    res.sendFile(__dirname+'/public/html/predict.html');
});

app.get('/favicon.ico', (req, res) => {
    res.send('no favicon.');
});

app.get('/*', (req, res) => {
    res.redirect('/join?error=Error 404 : ' + req.originalUrl + ' not found.');
});

// -- Gestion des emissions des sockets

io.on('connection', (socket) => {
    
    // Connection à la room
    socket.on('roomConnect', (name, room) => {
        var dupl_name = false;
        for (user in game_state[room]['users']){
            if (user == name) {
                dupl_name = true;
                break;
            }
        }

        socket.emit('roomValid', dupl_name, Object.keys(game_state[room]['users']).length);
        if (!dupl_name) {
            game_state[room]['users'][name] = new Object()
            game_state[room]['users'][name]['socket'] = socket;
            log_message(name.blue + ' (' + socket.id.italic.blue + ') has join room ' + room.red);
            update_player_list(room);
        }
    });
    
    // Gestion de la déconnection
    socket.on('disconnect', () => {
        disconnect_user(socket);
    });

    // Test de prediction
    socket.on('predict', (data) => {
        img.process(data)
            .then(data => {
                img.bufferToTensor(data)
                    .then(tensor => {
                        img.predict(tensor).then(result => {
                            socket.emit('predictDone', result);
                        })
                    })
            });                             
    });

    // Lancement d'une partie
    socket.on('startGame', (room, nb_ai) => {
        log_message("Game started for room " + room.red);
        startGame(room, nb_ai);
    });

    // Reception des dessins
    socket.on('draw', (room, username, data) => {
        game_state[room]['users'][username]['data'] = data;
        game_state[room]['users'][username]['socket'] = socket;

        var received_all = true;
        for (user in game_state[room]['users']) {
            if (game_state[room]['users'][user]['data'] == undefined) {
                received_all = false;
                break;
            }
        }

        // Passage à la suite quand on a reçu tout les dessins de la room
        if (received_all) {
            log_message('Room ' + room.red + ' has send all drawings.');
            var nb_ai = game_state[room]["nb_ai"];
            game_state[room]['status'] = 'guessing';
            game_state[room]['data_ai'] = new Array(nb_ai);

            // On genère les dessins des "AI"
            for (let i = 0; i < nb_ai; i++) {
                game_state[room]['data_ai'][i] = generate.genData(game_state[room]['word']);
            }

            // On récupère les dessins des joueurs
            var datas = new Array();
            for (user in game_state[room]['users']) {
                datas.push(game_state[room]['users'][user]['data']);
            }
            
            // On applique la prediction sur les dessins reçus et on sauvegarde les résultats
            img.predictDrawings(datas).then(result => {
                var i = 0;
                for (user in game_state[room]['users']) {
                    game_state[room]['users'][user]['pred'] = result[i];
                    i++;
                }
            })
            // On envoie le signal pour passer à la partie "guess"
            .finally(() => {
                for (user in game_state[room]['users']) {
                    game_state[room]['users'][user]['socket'].emit('guess');
                }
            });
        }
    });

    // Reception des scores
    socket.on('score', (room, username, score) => {
        game_state[room]['users'][username]['socket'] = socket;
        game_state[room]['users'][username]['guess_score'] = score;
        game_state[room]['users'][username]['pred_score'] = img.getScore(game_state[room]['users'][username]['pred'], game_state[room]['word']);

        log_message('Pred from ' + username.blue + ' : ');
        if (game_state[room]['users'][username]['pred'] != null) {
            for (i in classes) {
                console.log('[--------] > ' + classes[i] + ' : ' + (game_state[room]['users'][username]['pred'][i] * 100).toFixed(2));
            }
        } else {
            console.log('No prediction : drawing was empty.');
        }
        

        var received_all = true;
        for (user in game_state[room]['users']) {
            if (game_state[room]['users'][user]['guess_score'] == undefined) {
                received_all = false;
                break;
            }
        }

        // Passage à la suite quand on a reçu tout les dessins de la room
        if (received_all) {
            log_message('Room ' + room.red + ' has send all guessings.');
            for (user in game_state[room]['users']) {
                game_state[room]['users'][user]['socket'].emit('scoreReady');
            }
        }
    });

    // Envoie des données pour guess
    socket.on('roomdata', (room) => {
        var players = new Array();
        var data = new Array();
        var i = 0;
        for (user in game_state[room]['users']) {
            players[i] = user;
            data[i] = game_state[room]['users'][user]['data'];
            i++;
        }

        socket.emit('guessAnswer', players, data, game_state[room]['data_ai']);
    });

    // Envoie de la classe de la room
    socket.on('classRequest', (room) => {
        socket.emit('classAnswer', game_state[room]['word']);
    });

    // Envoi des scores d'une room
    socket.on('scoreRequest', (room, username) => {
        var players = new Array();
        var data = new Array();
        var guess_scores = new Array();
        var pred_scores = new Array();

        var i = 0;
        for (user in game_state[room]['users']) {
            players[i] = user;
            data[i] = game_state[room]['users'][user]['data'];
            guess_scores[i] = game_state[room]['users'][user]['guess_score'];
            pred_scores[i] = game_state[room]['users'][user]['pred_score'];
            i++;
        }

        socket.emit('scores', players, data, guess_scores, pred_scores);

        game_state[room]['users'][username]['score_sent'] = 'done';
        var received_all = true;

        for (user in game_state[room]['users']) {
            if (game_state[room]['users'][user]['score_sent'] != 'done') {
                received_all = false;
            }
        }

        // On réinitialise la room si tout le monde a reçu ses scores
        if (received_all) {
            log_message('Score sent to all users in room ' + room.red);
            clearInterval(game_state[room]['check']);
            initRoom(room);
        }
    });

});