const nodemailer = require('nodemailer');

// Useful constants
const CARRIER = {
  'AT&T': '@mms.att.net',
  'T-MOBILE': '@tmomail.net',
  'VERIZON': '@vzwpix.com',
  'SPRINT': '@pm.sprint.com'
};


// General purpose error handling
function error(err) {
  if(err) {
    console.log(err);
  }
}

// Converts an email to MMS
// Hardcoded gmail because I'm lazy
class TxtMsg {
  phonebook = {};
  sender = '';
  transport = null;

  /*
   * @Param Email handle
   * @Param Email password
   *
   */
  // Builds nodemailer transport and verifies
  constructor(auth) {
    this.sender = auth.user;
    this.transport = nodemailer.createTransport({
      'service': 'gmail',
      'auth': auth,
      'tls': {
        'rejectUnauthorized': false
      }
    });
    this.transport.verify(error);
  }

  /*
   * @Param 10-digit phone number (String)
   * @Param A string containing one of the carrier names
   */
  // Add new phone from supported carriers
  add(phone, carrier) {
    if(carrier in CARRIER) {
      this.phonebook[phone] = CARRIER[carrier];
    }

    return this;
  }

  /*
   * @Param 10-digit phone number (String)
   */
  // Removes a phone number from the phonebook
  remove(phone) {
    delete TxtMsg.phonebook[phone];

    return this;
  }

  /*
   * @Param 10-digit phone number (String)
   * @Param A string of text
   */
  // Sends a message to a specific phone number in the phonebook
  send(phone, message) {
    if(phone in this.phonebook) {
      this.transport.sendMail({
        'from': this.sender,
        'to': phone + this.phonebook[phone],
        'subject': '',
        'text': message
      }, null);
    }
  }

  /*
   * @Param A string of text
   */
   // Sends a message to all phone numbers in the phonebook
  sendAll(message) {
    let mailingList = Object.keys(this.phonebook).reduce((accumulator, current, index, array) => {
      accumulator += current + this.phonebook[current];

      if(index != array.length - 1) {
        accumulator += ', ';
      }

      return accumulator;
    }, error);

    this.transport.sendMail({
      'from': this.sender,
      'to': mailingList,
      'subject': '',
      'text': message
    }, error);
  }

}

module.exports = TxtMsg;
