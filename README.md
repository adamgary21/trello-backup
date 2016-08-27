## Trello card and attachments backup utility

#### What it does
* Takes in an API key, token, and directory name
* Fetches all Boards for the user associated with the token
 * Writes boards.json to the supplied directory name
 * Creates a directory for each board named by the board's ID
* Fetches all cards for each board
 * Fetches the attachments for cards that have any using the URL in the
    attachments array
 * Writes the attachments to their respective board directory

#### It would be better if it...
 * Did proper error checking for:
  * API Calls
  * Directory and file creation
  * ... and other unsafe operations
 * Had methods for restoring the backup by relating the saved data
 * Either appended the date to the backup directory name, implement rotations
 * Used bound callbacks/better structure to reduce call depth
