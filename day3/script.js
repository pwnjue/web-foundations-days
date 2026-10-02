let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

// 1. Search notes
function searchNotes(word) {
  const searchWord = word.toLowerCase();

  return notes.filter(note =>
    note.text.toLowerCase().includes(searchWord)
  );
}

// 2. Find the longest note
function longestNote() {
  if (notes.length === 0) {
    return null;
  }

  let longest = notes[0];

  for (let note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }

  return longest;
}

// 3. Count notes by category
function countByCategory() {
  const counts = {};

  for (let note of notes) {
    if (counts[note.category]) {
      counts[note.category]++;
    } else {
      counts[note.category] = 1;
    }
  }

  return counts;
}

// 4. Get summary
function getSummary() {
  const counts = countByCategory();
  const total = notes.length;

  const parts = Object.entries(counts).map(
    ([category, count]) =>
      `${count} ${category}`
  );

  const word = total === 1 ? "note" : "notes";

  return `${total} ${word}: ${parts.join(", ")}.`;
}

// 5. Check for duplicate
function isDuplicate(text) {
  const cleanedText = text.trim().toLowerCase();

  return notes.some(
    note => note.text.trim().toLowerCase() === cleanedText
  );
}

// 6. Add a note
function addNote(text, category) {
  const validCategories = ["personal", "work", "study"];

  if (text.length < 1 || text.length > 200) {
    console.log("Note must be between 1 and 200 characters.");
    return false;
  }

  if (isDuplicate(text)) {
    console.log("Note already exists.");
    return false;
  }

  if (!validCategories.includes(category)) {
    console.log("Invalid category.");
    return false;
  }

  const newNote = {
    id: notes.length + 1,
    text: text,
    category: category
  };

  notes.push(newNote);

  console.log("Note added successfully.");
  return true;
}


// ===============================
// TESTS
// ===============================

// searchNotes - normal case
console.log(searchNotes("javascript"));
// Expected: [{ id: 4, text: "Revise JavaScript arrays", category: "study" }]

// searchNotes - edge case
console.log(searchNotes("pizza"));
// Expected: []

// longestNote - normal case
console.log(longestNote());
// Expected: { id: 3, text: "Email the project report to Grace", category: "work" }

// longestNote - edge case
let originalNotes = notes;
notes = [];
console.log(longestNote());
// Expected: null
notes = originalNotes;

// countByCategory - normal case
console.log(countByCategory());
// Expected: { personal: 2, study: 2, work: 1 }

// countByCategory - edge case
notes = [];
console.log(countByCategory());
// Expected: {}
notes = originalNotes;

// getSummary - normal case
console.log(getSummary());
// Expected: "5 notes: 2 personal, 2 study, 1 work."

// getSummary - edge case
notes = [];
console.log(getSummary());
// Expected: "0 notes: ."
notes = originalNotes;

// isDuplicate - normal case
console.log(isDuplicate("Call mum"));
// Expected: true

// isDuplicate - edge case
console.log(isDuplicate("  CALL MUM  "));
// Expected: true

// isDuplicate - non-duplicate case
console.log(isDuplicate("Go shopping"));
// Expected: false

// addNote - normal case
console.log(addNote("Read a JavaScript book", "study"));
// Expected: true

// addNote - duplicate case
console.log(addNote("  Buy milk and bread  ", "personal"));
// Expected: false

// addNote - invalid category
console.log(addNote("Go for a walk", "health"));
// Expected: false

// addNote - empty text
console.log(addNote("", "personal"));
// Expected: false