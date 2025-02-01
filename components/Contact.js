// Contact.js
export default class Contact {
    constructor(id, name, phoneNumber, priority = 'Unset') {
      this.id = id; // Unique identifier
      this.name = name; // Contact's name
      this.phoneNumber = phoneNumber; // Contact's phone number
      this.priority = priority; // Contact's priority
    }
  }
  