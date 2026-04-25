// Caregiver-hub MongoDB schema.
// Run with:  mongosh "<your-connection-string>" schema.mongo.js
// Or paste the contents into mongosh interactively.
//
// Shape mirrors src/data/mockData.js. Validators are intentionally lenient so
// you can iterate during the hackathon — tighten "required" fields later.

const DB_NAME = "caregiver_hub";
const db = db.getSiblingDB(DB_NAME);

// ---------- caregivers (the logged-in user) ----------
db.createCollection("caregivers", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name"],
      properties: {
        _id:       { bsonType: ["objectId", "string"] },
        name:      { bsonType: "string" },
        initials:  { bsonType: "string" },
        email:     { bsonType: "string" },
        createdAt: { bsonType: "date" },
      },
    },
  },
});
db.caregivers.createIndex({ email: 1 }, { unique: true, sparse: true });

// ---------- patients ----------
db.createCollection("patients", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["caregiverId", "fullName"],
      properties: {
        _id:           { bsonType: ["objectId", "string"] },
        caregiverId:   { bsonType: ["objectId", "string"] },
        displayName:   { bsonType: "string" },
        fullName:      { bsonType: "string" },
        initials:      { bsonType: "string" },
        avatarColor:   { bsonType: "string" },
        age:           { bsonType: "int" },
        dob:           { bsonType: "string" },         // "MM/DD/YYYY" to match mock
        primaryDoctor: { bsonType: "string" },
        createdAt:     { bsonType: "date" },
      },
    },
  },
});
db.patients.createIndex({ caregiverId: 1 });

// ---------- conditions ----------
db.createCollection("conditions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["patientId", "label"],
      properties: {
        _id:       { bsonType: ["objectId", "string"] },
        patientId: { bsonType: ["objectId", "string"] },
        label:     { bsonType: "string" },
        tone:      { enum: ["diabetes", "hypertension", "ckd", "ortho", null] },
        createdAt: { bsonType: "date" },
      },
    },
  },
});
db.conditions.createIndex({ patientId: 1 });

// ---------- medications ----------
db.createCollection("medications", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["patientId", "name"],
      properties: {
        _id:       { bsonType: ["objectId", "string"] },
        patientId: { bsonType: ["objectId", "string"] },
        name:      { bsonType: "string" },
        dose:      { bsonType: "string" },
        schedule:  { bsonType: "string" },
        withFood:  { bsonType: "bool" },
        createdAt: { bsonType: "date" },
      },
    },
  },
});
db.medications.createIndex({ patientId: 1 });

// ---------- events (calendar) ----------
db.createCollection("events", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["patientId", "date", "title", "type"],
      properties: {
        _id:       { bsonType: ["objectId", "string"] },
        patientId: { bsonType: ["objectId", "string"] },
        date:      { bsonType: "string" },             // "YYYY-MM-DD"
        time:      { bsonType: "string" },             // "HH:MM"
        title:     { bsonType: "string" },
        subtitle:  { bsonType: "string" },
        type: {
          enum: ["medication", "appointment", "vitals", "activity", "meal", "lab"],
        },
        createdAt: { bsonType: "date" },
      },
    },
  },
});
db.events.createIndex({ patientId: 1, date: 1 });
db.events.createIndex({ patientId: 1, type: 1 });

// ---------- doctor notes ----------
db.createCollection("doctor_notes", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["patientId", "body"],
      properties: {
        _id:       { bsonType: ["objectId", "string"] },
        patientId: { bsonType: ["objectId", "string"] },
        weekOf:    { bsonType: "string" },             // "YYYY-MM-DD"
        author:    { bsonType: "string" },
        date:      { bsonType: "string" },             // "MM/DD"
        body:      { bsonType: "string" },
        sourceFile: { bsonType: "string" },            // optional uploaded file ref
        createdAt: { bsonType: "date" },
      },
    },
  },
});
db.doctor_notes.createIndex({ patientId: 1, weekOf: 1 });

// ---------- personal notes (caregiver's own notes) ----------
db.createCollection("personal_notes", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["patientId", "body"],
      properties: {
        _id:       { bsonType: ["objectId", "string"] },
        patientId: { bsonType: ["objectId", "string"] },
        author:    { bsonType: "string" },
        body:      { bsonType: "string" },
        createdAt: { bsonType: "date" },
      },
    },
  },
});
db.personal_notes.createIndex({ patientId: 1, createdAt: -1 });

print("Created collections in DB '" + DB_NAME + "':");
printjson(db.getCollectionNames());
