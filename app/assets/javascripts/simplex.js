
var initial_objective_function= [];
var constraints = [];

var original_tableau;
var phase1_tableau;
var phase1_objective = [];


var phase2_tableau;

var min;

// sign: GTE = -1, LTE = 1
// initial problem objective function and constraints
// NOT INCLUDING Z... just x1..n, rhs
var Inequality = function(lhs, sign, rhs){
  this.lhs = lhs;
  this.sign = sign;
  this.rhs = rhs;
}

// function Tableau(obj, constraints){
//   this.obj =  obj.slice();
//   this.constraints = constraints.slice();
// }
var Tableau = function(matrix, ns, na, sym){
  this.matrix = matrix;

  this.sym = sym || "z";

  this.num_s = ns;
  this.num_a = na;
  this.num_x = matrix[0].length - 1 - 1 - ns - na;
}



function pivot(matrix, column, row){

  // use ratio test to find pivot, or use provided row (when making artificial variables basic or bringing back variables for start of phase 2)
  var pivot_row = row || choose_pivot(matrix, column);

  // make entering variable = 1
  var pivot_value = matrix[pivot_row][column];


  var num_columns = matrix[0].length;
  var num_rows = matrix.length;

  for (var i = 0; i < num_columns; i ++){
    matrix[pivot_row][i] = matrix[pivot_row][i] / pivot_value;
  }

  //add/subtract pivot row from other rows to clear the column
  for (var i = 0; i < num_rows; i ++){
    if (i != pivot_row){
      var column_val = matrix[i][column];

      for (var j = 0; j < num_columns; j++){
        matrix[i][j] = matrix[i][j] - column_val * matrix[pivot_row][j];
      }
    }

  }

}

// find pivot row with ratio test 
function choose_pivot(matrix, column){
  var pivot_row = 0;
  var best_ratio = -1;
  var num_columns = matrix[0].length;

  
  // conduct ratio test on each eligible (>0 column val) row
  for (var i = 1; i < matrix.length; i ++){
    if (matrix[i][column] > 0){


      var ratio = matrix[i][num_columns -1] / matrix[i][column];

      if (best_ratio < 0 || best_ratio > ratio){
        best_ratio = ratio;
        pivot_row = i;
      } 
    }
  }

  return pivot_row;
}

// get col/row pairs of basic variables
// excluding z ( and  rhs )
function basic_variables(tableau){

  var matrix = tableau.matrix;
  var num_columns = matrix[0].length;
  var num_rows = matrix.length;

  var basic_variables = [];

  for (var j = 1; j < num_columns - 1; j ++){
    var sum = 0;
    var row = 0;
    for (var i = 0; i < num_rows; i++ ){
      if ( matrix[i][j] == 1 ) {
        row = i;
        sum += 1;
      }else if (matrix[i][j] != 0){
        sum = -1;
        break;
      }
    }
    if (sum == 1){
      basic_variables.push([j, row]);
    }

  }

  return basic_variables;

}



// standard form with slack variables
function createOriginalTableau(obj, constraints){

  var tableau = []

  for(var i = 0; i < constraints.length; i++ ){
    var constraint_row = constraints[i].lhs.slice();
    constraint_row.unshift(0); // z coeff 
    tableau.push(constraint_row);
  }

  // convert to standard form (+, - slack variables)
  for (var i = 0; i < constraints.length; i++){
      for(var j = 0; j < constraints.length; j++){
        if (i == j){
          tableau[j].push(constraints[i].sign);
        }else{
          tableau[j].push(0);
        }
      }
  }

  // add the RHS
  for (var i = 0; i < constraints.length; i++){
    tableau[i].push(constraints[i].rhs);
  }  

  // add the obj function (z) row
  var z_row = obj.lhs.slice();
  z_row.unshift(1); // z coeff
  for (var i = 0; i < constraints.length; i ++){
    z_row.push(0); //slack variable coeffs are 0 for z row
  }  
  z_row.push(0); // rhs = 0

  tableau.unshift(z_row); // first row in tableau

  original_tableau = new Tableau(tableau, constraints.length, 0);

}


function convertToMax(tableau){

  var z_row = tableau.matrix[0];
  for (var i = 0; i < z_row.length; i ++){
    z_row[i] *= -1; 
  }
}


function createPhaseOneTableau(){

  var tableau = []

  // x + slack variables (1 per constraint)
  var num_decision_vars = constraints[0].lhs.length + constraints.length;


  for(var i = 0; i < constraints.length; i++ ){
    var constraint_row = constraints[i].lhs.slice();
    constraint_row.unshift(0); // z coeff 
    tableau.push(constraint_row);
  }

  // convert to standard form (+, - slack variables)
  for (var i = 0; i < constraints.length; i++){
      for(var j = 0; j < constraints.length; j++){
        if (i == j){
          tableau[j].push(constraints[i].sign);
        }else{
          tableau[j].push(0);
        }
      }
  }


  var num_artificial_vars = 0;

  // add artificial variables
  for (var i = 0; i < constraints.length; i++){
   
      // constraint cannot be satisfied by trivial solution, add artifical var
      if (constraints[i].sign == -1){
        num_artificial_vars ++;

        for (var j = 0; j < constraints.length; j++){

          if (i == j){
            tableau[j].push(1);
          }else{
            tableau[j].push(0);
          }
        }

      }
  }


  // add the RHS
  for (var i = 0; i < constraints.length; i++){
    tableau[i].push(constraints[i].rhs);
  }  

  // phase 1 objective
  var w_row = [1];
  for (var i = 0;  i < num_decision_vars; i++){
    w_row.push(0);
  }
  for (var i = 0; i < num_artificial_vars; i++){
    w_row.push(1);
  }
  w_row.push(0);


  tableau.unshift(w_row); // first row in tableau

  phase1_tableau = new Tableau(tableau, constraints.length, num_artificial_vars, "w");

  // if return 0, phase 1 can be skipped
  return num_artificial_vars;

}

function createCanonicalPhaseOne(tableau){

  var matrix = tableau.matrix;
  var num_a = tableau.num_a;

  //length - 1: rhs
  //length - 2: last artificial column
  //length - 1 - num_a: first artificial column
  // sufficicent to check for a 1 in one of these columns to find artificial variable row
  // pivot on the artificial variables
  for (var i = 1; i < matrix.length; i ++){
    var row = matrix[i];
    for (var j = row.length - 1 - num_a; j < row.length - 1; j++){
      if (matrix[i][j] == 1){
        pivot(matrix, j, i);
      }
    }
  }
}

// 1: done (none left to compute)
// 0: mor epivots needed
// -1: unbounded

function computeNext(tableau){

  var done = true;

  var matrix = tableau.matrix;
  var num_columns = matrix[0].length;

  var min = 0; 
  var min_col = 0;

  // ignore z column, rhs
  for(var i = 1; i < num_columns -1 ; i ++){

    // variable can be improved
    if (matrix[0][i] < min){
      done = false;
      min = matrix[0][i];
      min_col = i;
    }

  }

  // pivot on column with most negative reduced cost. 
  // report unboundedness if column is all <= 0.
  // if (min_col > 0 && checkUnbounded(matrix, min_col)){
  //   return -1;
  // }

  pivot(matrix, min_col);

  return (done? 1 : 0);

}

// check if phase 1 problem is feasible
function checkFeasibility(tableau){
  var num_columns = tableau.matrix[0].length;
  return (tableau.matrix[0][num_columns - 1] == 0);
}


// check if the tableau is unbounded
function checkUnbounded(tableau){

  var matrix = tableau.matrix;

  //iterate each column (excluding z, rhs) to check for negative reduced cost variable with nonpositive coefficients
  for (var c = 1; c < matrix[0].length - 1; c ++ ){
    var unbounded = false;

    // cost row coefficient is -ve (can be improved)
    if(matrix[0][c] < 0){
      unbounded = true;

      // check for a positive coefficient in the column
      for(var i = 1; i < matrix.length; i++){
        if (matrix[i][c] > 0){
          unbounded = false;
        }
      }
    }
    // unbounded column found
    if (unbounded){
      return true;
    }
  }
  return false;
}


// create phase 2 after solving phase 1.. otherwise it's just the BFS matrix?
function createPhaseTwoTableau(){

  var matrix = [];
  var a = phase1_tableau.num_a;
  var num_columns = phase1_tableau.matrix[0].length;

  // put back original objective
  var obj = original_tableau.matrix[0].slice();
  matrix.push(obj);


  for (var i = 1; i < phase1_tableau.matrix.length; i ++){
    // remove artificial vars
    var row = phase1_tableau.matrix[i].slice();
    row.splice(num_columns-1-a, a);
    matrix.push(row);

  }



  // bring phase 1 basic variables back in
  var basic_vars = basic_variables(phase1_tableau);

  for (var i = 0; i < basic_vars.length; i ++){
      pivot(matrix, basic_vars[i][0], basic_vars[i][1]);
  }



  var s = phase1_tableau.num_s;

  //matrix, ns, na, sym
  phase2_tableau = new Tableau(matrix, s, 0, "z" );
}