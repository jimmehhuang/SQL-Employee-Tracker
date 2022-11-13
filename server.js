const mysql2 = require('mysql2');
const inquirer = require('inquirer');
require('console.table');

// create mysql connection
const connection = mysql2.createConnection({
    host: 'localhost',
    port: 3306,
    password: 'HMCC@Atx2017',
    user: 'root',
    database: 'employees_db'
});
// error handling
connection.connect(err => {
    if (err) throw err;
    prompt();
});


function prompt() {
    console.log('===============\nWELCOME MANAGER.\n===============');
    inquirer.prompt({
            name: 'action',
            type: 'list',
            message: 'What would you like to do?',
            choices: [
                "View all Departments",
                "View all Roles",
                "View all Employees",
                "Add Department",
                "Add Role",
                "Add Employee",
                "Update Employee Role",
                "Exit"
            ]
        })
        .then(answer => {
            console.log('answer', answer);
            switch (answer.action) {
                case "View all Departments":
                    viewAllDepartments();
                    break;

                case "View all Roles":
                    viewAllRoles();
                    break;

                case "View all Employees":
                    viewAllEmployees();
                    break;

                case "Add Department":
                    addDepartment();
                    break;

                case "Add Role":
                    addRole();
                    break;

                case "Add Employee":
                    addEmployee();
                    break;

                case "Update Employee Role":
                    updateRole();
                    break;

                case "Exit":
                    connection.end();
                    break;
            }
        });
}

// user chooses "view all departments"
function viewAllDepartments() {
    const query = `SELECT department.name AS department, role.title, employee.id, employee.first_name, employee.last_name
    FROM employee
    LEFT JOIN role ON (role.id = employee.role_id)
    LEFT JOIN department ON (department.id = role.department_id)
    ORDER BY department.name;`;
    connection.query(query, (err, res) => {
        if (err) throw err;
        console.log('Viewing all employees by departments.\n');
        console.table(res);
        prompt();
    });
}

// user chooses "view all roles"
function viewAllRoles() {
    const query = `SELECT * FROM role`;
    connection.query(query, (err, res) => {
        if (err) throw err;
        console.log('Viewing roles.\n');
        console.table(res);
        prompt();
    });

}

// user chooses "view all employees"
function viewAllEmployees() {
    const query = `SELECT employee.id, employee.first_name, employee.last_name, role.title, department.name AS department, role.salary, CONCAT(manager.first_name, ' ', manager.last_name) AS manager
    FROM employee
    LEFT JOIN employee manager on manager.id = employee.manager_id
    INNER JOIN role ON (role.id = employee.role_id)
    INNER JOIN department ON (department.id = role.department_id)
    ORDER BY employee.id;`;
    connection.query(query, (err, res) => {
        if (err) throw err;
        console.log('Viewing all employees.\n');
        console.table(res);
        prompt();
    });
}

// user chooses "add department"
async function addDepartment() {
    const department = await inquirer.prompt(askDepartment());
    connection.query('SELECT department.id, department.name FROM department ORDER BY department.id;', async (err, res) => {
        if (err) throw err;
        connection.query(`INSERT INTO department SET (department.name= ${res.department});`);
        console.log('Department added successfully.');
        prompt();
})
}

// ask for input of the department name, separated from addDepartment function
function askDepartment() {
    return ([
        {
            name: "department",
            type: "input",
            message: "Please enter the name of the new department."
        }
    ]);
}

// user chooses "add role"
async function addRole() {
    const role = await inquirer.prompt(askRole());
    connection.query('SELECT * FROM role', async (err, res) => {
        if (err) throw err;
        connection.query(`INSERT INTO role SET (role.name= ${res.department});`);
        console.log('Department added successfully.');
        prompt();
        connection.query(
            'INSERT INTO employee SET ?',
            {
                title: role.title,
                salary: parseInt(role.salary),
                department_id: role.deptid,
            },
            (err, res) => {
                if (err) throw err;
                prompt();
            }
        );
})
}

// ask for new role name
function askRole(){
        return ([
            {
                name: "title",
                type: "input",
                message: "What is the name of the new role you are implementing?"
            },
            {
                name: "salary",
                type: "input",
                message: "How much does this position make, in USD?"
            },
            {
                name: "deptid",
                type: "choice",
                message: "Which department will this position be added to?"
            }
        ]);
}
// user chooses "add employee"
async function addEmployee() {
    const addname = await inquirer.prompt(askName());
    connection.query('SELECT role.id, role.title FROM role ORDER BY role.id;', async (err, res) => {
        if (err) throw err;
        const { role } = await inquirer.prompt([
            {
                name: 'role',
                type: 'list',
                choices: () => res.map(res => res.title),
                message: 'What is the employee role?'
            }
        ]);
        let roleId;
        for (const row of res) {
            if (row.title === role) {
                roleId = row.id;
                continue;
            }
        }
        connection.query('SELECT * FROM employee', async (err, res) => {
            if (err) throw err;
            let choices = res.map(res => `${res.first_name} ${res.last_name}`);
            choices.push('none');
            let { manager } = await inquirer.prompt([
                {
                    name: 'manager',
                    type: 'list',
                    choices: choices,
                    message: "Who is this employee's manager?"
                }
            ]);
            let managerId;
            let managerName;
            if (manager === 'none') {
                managerId = null;
            } else {
                for (const data of res) {
                    data.fullName = `${data.first_name} ${data.last_name}`;
                    if (data.fullName === manager) {
                        managerId = data.id;
                        managerName = data.fullName;
                        console.log(managerId);
                        console.log(managerName);
                        continue;
                    }
                }
            }
            console.log('Employee added. Please verify employee has been correctly added to database.');
            connection.query(
                'INSERT INTO employee SET ?',
                {
                    first_name: addname.first,
                    last_name: addname.last,
                    role_id: roleId,
                    manager_id: parseInt(managerId)
                },
                (err, res) => {
                    if (err) throw err;
                    prompt();
                }
            );
        });
    });

}

// ask for employee name, separated from addEmployee function
function askName() {
    return ([
        {
            name: "first",
            type: "input",
            message: "Please enter the employee's first name."
        },
        {
            name: "last",
            type: "input",
            message: "Please enter the employee's last name."
        }
    ]);
}

// user chooses "update employee role"
async function updateRole() {
    const employeeId = await inquirer.prompt(askId());

    connection.query('SELECT role.id, role.title FROM role ORDER BY role.id;', async (err, res) => {
        if (err) throw err;
        const { role } = await inquirer.prompt([
            {
                name: 'role',
                type: 'list',
                choices: () => res.map(res => res.title),
                message: 'What is the new employee role?: '
            }
        ]);
        let roleId;
        for (const row of res) {
            if (row.title === role) {
                roleId = row.id;
                continue;
            }
        }
        connection.query(`UPDATE employee 
        SET role_id = ${roleId}
        WHERE employee.id = ${employeeId.name}`, async (err, res) => {
            if (err) throw err;
            console.log('Role has been updated.')
            prompt();
        });
    });
}

// ask for employee ID, separated from updateRole function
function askId() {
    return ([
        {
            name: "name",
            type: "input",
            message: "What is the ID of the employee you are updating?"
        }
    ]);
}
