import * as keys from "./game/keys";

window.addEventListener("load", () => {
    const table = document.getElementById("help-keys");
    let prevCategory = undefined;
    keys.Specs.forEach(spec => {
        if (!spec.hide) {
            if (spec.category !== prevCategory) {
                const sep = document.createElement("tr");
                sep.innerHTML = `<td>${spec.category.toUpperCase()}</td><td><hr></tr>`;
                table.appendChild(sep);
            }
            const row = document.createElement("tr");
            const left = document.createElement("td");
            left.textContent = spec.label;
            left.classList.add("help-keycap");
            const right = document.createElement("td");
            right.textContent = spec.description;
            right.classList.add("help-description");
            row.appendChild(left)
            row.appendChild(right);
            table.appendChild(row);
            prevCategory = spec.category;
        }
    });
});
