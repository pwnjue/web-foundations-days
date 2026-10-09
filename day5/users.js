
const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const status = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

let users = [];

async function loadUsers() {
  loadButton.disabled = true;
  status.textContent = "Loading users...";
  usersList.replaceChildren();

  try {
    const response = await fetch(
      "https://jsonplaceholder.typicode.com/users"
    );

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    users = await response.json();
    renderUsers(users);

    status.textContent = `Successfully loaded ${users.length} users.`;
  } catch (error) {
    users = [];
    usersList.replaceChildren();
    status.textContent = "Error loading users. Please try again.";
    console.error(error);
  } finally {
    loadButton.disabled = false;
  }
}

function renderUsers(list) {
  usersList.replaceChildren();

  if (list.length === 0) {
    status.textContent = "No users match your filter.";
    return;
  }

  list.forEach(user => {
    const li = document.createElement("li");
    const name = document.createElement("h2");
    const email = document.createElement("p");
    const city = document.createElement("p");
    const company = document.createElement("p");

    name.textContent = user.name;
    email.textContent = `Email: ${user.email}`;
    city.textContent = `City: ${user.address.city}`;
    company.textContent = `Company: ${user.company.name}`;

    li.append(name, email, city, company);
    usersList.appendChild(li);
  });
}

loadButton.addEventListener("click", loadUsers);

filterInput.addEventListener("input", () => {
  const searchText = filterInput.value.toLowerCase();

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchText)
  );

  renderUsers(filteredUsers);
});