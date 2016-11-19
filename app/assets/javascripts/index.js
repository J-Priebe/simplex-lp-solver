$(document).ready(function(){ 


  // submit number of decision variables
  // show form for inputting objective function and constraints
  $('#submit-num-vars-button').click(function(){

    var num_dvs = parseInt($('#num-decision-variables').val());
    // remember number of decision variables for adding new constraints
    $('#add-constraint').data('n', num_dvs);

    for (var i = 0; i < num_dvs-1; i++){
      $('#of-row').find('td:last').after('<td class="of-coeff"><input type="number" value="0" size="1" />x' + (i + 1) + '&nbsp;+&nbsp;</td>');
      $('#nz-constraint').before('<td></td>');
    }
    $('#of-row').find('td:last').after('<td class="of-coeff"><input type="number" value="0" size="1" />x' + (num_dvs));
    $('#nz-constraint').before('<td></td>');

    var newRow = constraintRow(num_dvs);
    $('#nz-row').before(newRow);

    $('#num-dvs-container').slideUp();
    $('#inputs-container').show();  
    
  });

  // submit objective function and constaints
  // show the standard-form equalities
  $('#submit-constraints-button').click(function(){

    // convert min to max
    min = ($('#min-max-select').val() == 'min');

    var zrow = [];

    // z row for tableau
    $('#of-row').children('.of-coeff').each(function(){
      var val = $(this).find("input").val();
      zrow.push(-1 * parseFloat(val));
    });


    initial_objective_function = new Inequality(zrow, null, 0);


    // add all the constraints
    $('.constraint-coeffs').each(function(){
      var constraintRow = [];

      var row = $(this);

      row.children('.constraint-coeff').each(function(){
        var input = parseFloat( $(this).find('input').val() );
        constraintRow.push(input);
      });
      var sign = parseInt(row.find('.constraint-sign').first().find('select').val());

      var rhs_coeff = parseInt(row.find('.rhs-coeff').first().find('input').val());

      var ineq = new Inequality(constraintRow, sign, rhs_coeff);
      constraints.push(ineq);

    });


    // create standard from tableau with slack variables
    createOriginalTableau(initial_objective_function, constraints);

    if (min){
      convertToMax(original_tableau);
      $('#calc-phase1-button').before('<p>Converted to maximization problem (multiplied objective function by -1)</p>');
    }


    var original_table = createTableauElement(original_tableau);
    $('#calc-phase1-button').before('<p>Standard Form: </p>');
    $('#calc-phase1-button').before(original_table);


    if (checkUnbounded(original_tableau)){

      // done.
      $('#calc-phase1-button').before('<p>Problem is unbounded.</p>');
      $('#calc-phase1-button').hide(); // remove option to proceed to next step

    }

    // replace inputs with their values
    $('#inputs-table').find(':input[type="number"]').each(function(){
      var val = $(this).val();
      $(this).replaceWith(val);
    });


    $('#standard-form-container').show();
    $('#submit-constraints-button').slideUp();
  });

  $('#calc-phase1-button').click(function(){

    var num_artificial_vars = createPhaseOneTableau();

    // no bfs, must create and solve phase 1 problem first
    if (num_artificial_vars > 0){
      $('#calc-phase2-button').before('<p>Initial problem does not have a trivial solution; forming phase 1 by adding artificial variables.</p>');


      var p1_table = createTableauElement(phase1_tableau);
      $('#calc-phase2-button').before('<p>Initial Phase 1 Tableau:</p>');
      $('#calc-phase2-button').before(p1_table);
      createCanonicalPhaseOne(phase1_tableau);
      var p1_table = createTableauElement(phase1_tableau);
      $('#calc-phase2-button').before('<p>Canonical Phase 1 Tableau (aritifical vars made basic):</p>');
      $('#calc-phase2-button').before(p1_table);

      var pivot_n = 1;
      var status;
      // returns true when final tableau is formed
      while(1){
        status = computeNext(phase1_tableau);
        if(status == -1){
          $('#calc-phase2-button').before('<p>Pivot row has all <= 0 values; problem is unbounded.</p>');
          break;
        }
        var p1_table = createTableauElement(phase1_tableau);
        $('#calc-phase2-button').before('<p>Phase 1, Pivot '+ pivot_n + ':</p>');
        $('#calc-phase2-button').before(p1_table);
        pivot_n++;

        if(status == 1){
          break;
        }


      }


      // //final pivot
      // var p1_table = createTableauElement(phase1_tableau);
      // $('#phase-one-container').append('<p>Phase 1, Pivot '+ pivot_n + ' (final):</p>');
      // $('#phase-one-container').append(p1_table);


      if (checkFeasibility(phase1_tableau)){
        $('#calc-phase2-button').before('<p>Phase 1 is feasible; artificial variables brought to 0. forming phase 2.</p>');
        createPhaseTwoTableau();

      }else{
        $('#calc-phase2-button').before('<p>Phase 1 is not feasible; therefore original problem is not feasible.</p>');
        return;
      }


    }else{

      $('#calc-phase2-button').before('<p>Trivial (x1...n = 0) Basic Feasible Solution is available, skipping to phase 2.</p>');
      phase2_tableau = original_tableau;
    }

    if (status == -1){
      $('#calc-phase2-button').hide();
    }

    $('#phase-one-container').show();
    $('#calc-phase1-button').slideUp();
  });

  $('#calc-phase2-button').click(function(){

    var p2_table = createTableauElement(phase2_tableau);
    $('#calc-solution-button').before('<p>Phase Two: Original objective, artifical variables removed, basic variables from Phase 1 brought in.</p>');
    $('#calc-solution-button').before(p2_table);

    // // returns true when final tableau is formed
    var pivot_n = 1;

    // returns true when final tableau is formed
    var status;
    while(1){
      status = computeNext(phase2_tableau);
      if(status == -1){

        $('#calc-solution-button').before('<p>Pivot row has all <= 0 values; problem is unbounded.</p>');
        break;
      }
      var p2_table = createTableauElement(phase2_tableau);
      $('#calc-solution-button').before('<p>Phase 2, Pivot '+ pivot_n + ':</p>');
      $('#calc-solution-button').before(p2_table);
      pivot_n++;

      if(status == 1){
        break;
      }
    }

    if (status == -1){
      $('#calc-solution-button').hide();
    }
    $('#phase-two-container').show();
    $('#calc-phase2-button').slideUp();
  });

  $('#calc-solution-button').click(function(){

    optimal_solution = phase2_tableau.matrix[0][phase2_tableau.matrix[0].length - 1] / phase2_tableau.matrix[0][0] ;

    $('#final-solution-container').append('<p>Optimal Z Value: </p>');
    $('#final-solution-container').append(optimal_solution);

    $('#final-solution-container').show();
    $('#calc-solution-button').slideUp();

  });


  $('#add-constraint').click(function(){

    var num_vars = parseInt($('#add-constraint').data('n'));

    var newRow = constraintRow(num_vars);
    $('#nz-row').before(newRow);
  });


  
});


// standard form in equality format (as opposed to tableau)
function createStandardFormElement(tableau){

}


function createTableauElement (tableau){
  var table = $('<table></table>');
  var th = $('<tr></tr>');

  var ns = tableau.num_s;
  var na = tableau.num_a;
  var nx = tableau.num_x;
  var sym = tableau.sym;
  var matrix = tableau.matrix

  //HEADER
  th.append('<th>' + sym + '</th>');
  for (var i = 0; i < nx; i ++){
    th.append('<th>x' + (i+1) + '</th>');
  }
  for (var i = 0; i < ns; i ++){
    th.append('<th>s' + (i+1) + '</th>');
  }
  for (var i = 0; i < na; i ++){
    th.append('<th>y' + (i+1) + '</th>');
  }
  th.append('<th> RHS </th>');
  table.append(th);

  for (var i = 0; i < matrix.length; i ++){
    var tr = $('<tr></tr>');
    for (var j = 0; j < matrix[i].length; j++){
      var num = matrix[i][j];
      num = +num.toFixed(2);
      tr.append('<td>'+ num + '</td>');
    }
    table.append(tr);
  }

  return table;

}

function equalityToString(lhs, rhs){
  var str =""; 
  var sym ="z";

  var var_num = "";

  for (var i = 0; i< lhs.length; i++){

    if(i == 1){
      sym = "x";
      var_num = 1;
    }

    if(i == num_dvs + 1){
      sym = "s";
      var_num = 1;
    }
    if(i == num_dvs + num_slack_vars + 1){
      sym = "y";
      var_num = 1;
    }

    // str+= lhs[i] + sym + "  ";

    var val = lhs[i];
    var coeff_sign;
    if ( val >= 0){
      coeff_sign = (i > 1 ? "+" : "");
    }else{
      coeff_sign = "-";
    }

    var abs_val = Math.abs(val); 

    if (val != 0){
      if (abs_val ==1){
        str += coeff_sign + " " + sym + var_num;
      }else{
        str += coeff_sign + " " + abs_val + sym + var_num;
      }
    }

    var_num ++;
  }

  str += " = " + rhs;

  return str;
}

function constraintRow(n){

  var constraint= $('<tr class="constraint-coeffs"><td></td><td></td></tr>');


  for (var i = 0; i < n-1; i++){
    constraint.append('<td class="constraint-coeff"><input type="number" value="0" size="1" />x' + (i+1) + '&nbsp;+&nbsp;</td>');
  }
  constraint.append('<td class="constraint-coeff"><input type="number" value="0" size="1" />x' + (n) + '</td>');


  var select= $('<td class="constraint-sign"><select><option value="1"> <= </option><option value="-1"> >= </option></select></td>');
  constraint.append(select);
  var rhs_td = $('<td class="rhs-coeff"><input type="number" value="0" min="0" size="1" /></td>')
  constraint.append(rhs_td);

  return constraint;

}
