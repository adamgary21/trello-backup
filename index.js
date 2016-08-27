var nodeTrello  = require('node-trello'),
    request     = require('request'),
    path        = require('path'),
    fs          = require('fs'),
    util        = require('util'),
    argParser   = require('minimist')(process.argv.slice(2)),
    backupDir, trello;

// Setting constant value for directory permissions on creation
const MKDIR_MODE = "700";

/**
 * Parses command line arguments and ensures required values are present
 *
 * @return {Object} backup
 */
function parseArgs() {
    if (argParser.h) {
        return printHelp(true);
    }
    else if (argParser.k && argParser.t && argParser.n) {
        // Create new node-trello object using the supplied key and token
        trello = new nodeTrello(argParser.k, argParser.t);
        return backup();
    }
    else {
        console.log(`
    Error: Invalid options, please see usage:`);
        return printHelp(false);
    }
}

/**
 * Main backup logic
 *
 * @summary Fetches boards, creates a folder for each named with the board's ID
 *          then each board's cards, from within the cards[] the attachments are
 *          then fetched and saved in their respective directory.
 *
 * @return {void}
 */
function backup() {
    backupDir = path.join(__dirname, argParser.n);

    console.log(`Backing up all boards to ${backupDir}`);

    // Make main backup directory
    fs.mkdir(backupDir, MKDIR_MODE, function() {

        // Fetch al boards for this user
        getBoards(function(boards) {
            console.log(`Found ${boards.length} boards, backing them up now`);

            // For each board...
            boards.map(function(board, boardIndex, boardArray) {

                // Create a driectory to store board's data and...
                fs.mkdir(path.join(backupDir, board.id), MKDIR_MODE, function() {

                    // Fetch the cards for this board, then...
                    getCards(board.id, function(data) {

                        // Write the card Object out to file and...
                        writeObject("cards", path.join(backupDir, board.id), data);

                        // Iterate the cards and fetch attachments if they exist
                        data.cards.map(function(card, cardIndex, cardArray) {
                            if (card.hasOwnProperty('attachments')) {
                                getAttachements(card.attachments,
                                    path.join(backupDir, board.id));
                            }
                        });
                    });
                });
            });

        });
    });
}

/**
 * Calls Trello's API and returns an array of boards.
 *
 * @param  {Function} cb Callback
 *
 * @return {Object[]}    Array of boards
 */
function getBoards(cb) {
    var boardOpts = {
            boards: "all",
            board_fields: "name"
        };

    trello.get("/1/members/me/boards", boardOpts, function (err, data) {
        if (err) throw err;
        writeObject("boards", backupDir, data, function(){
            return cb(data);

        });
    });
}

/**
 * Calls Trello's API and returns an array of cards.
 *
 * @param  {Number}   boardID Board ID to fetch cards from
 * @param  {Function} cb      Callback
 *
 * @return {Function}         Callback
 */
function getCards(boardID, cb) {
    var cardOpts = {
            cards: "all",
            card_attachments: "true"
        };

    trello.get(`/1/boards/${boardID}`, cardOpts, function(err, data) {
        if (err) throw err;
        return cb(data);
    });
}

/**
 * Writes JSON Object out to a specified filename in specified directory
 *
 * @param  {String}   name Filename (.json will be appended)
 * @param  {String}   dir  Directory in which to save the file
 * @param  {Object}   data Contents to be written to the file
 * @param  {Function} cb   Callback
 *
 * @return {Function}      Callback
 */
function writeObject(name, dir, data, cb) {
    var filePath = path.join(dir, `${name}.json`);
    fs.writeFile(filePath ,JSON.stringify(data), function(err) {

        // Simple value and type checking on the callback
        if (cb && typeof(cb) == 'function') return cb();
    });
}

/**
 * Fetches attachments by their URL in the attachments Object[]
 *
 * @param  {Object[]} attachments Attachments array
 * @param  {String}   dir         Directory to save fetched attachment
 *
 * @return {void}
 */
function getAttachements(attachments, dir) {
    attachments.map(function(attachment, index, array) {
        console.log(`
            saving => ${attachment.name}
            to => ${dir}
            `);
        request(attachment.url)
            .pipe(fs.createWriteStream(path.join(dir, attachment.name)));
    });
}

/**
 * Function for printing the help with or without description
 *
 * @param  {Boolean} showDesc
 *
 * @return {void}
 */
function printHelp(showDesc) {
    var desc = "";

    if (showDesc) {
        desc =
        `This tool helps back up Trello boards, their lists, and cards for a
    specified user via the user's API key and token.
    `;
    }
    console.log(`
    ${desc}
    Required fields:
        -k  API key         [key]           (required)
        -n  Backup name     [name]          (required)
        -t  API token       [token]         (required)

    Optional Fields:
        -a  Get Attachments [true|false]    (optional, default=false)

    Example:
        node backupTrello -k 3d1522c... -t 55782c2b664c9c... -a true
        `);
}

// Kick off parsing the command line arguments
parseArgs();
