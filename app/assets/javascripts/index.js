$(document).ready(function(){ 


  // submit number of decision variables
  // show form for inputting objective function and constraints
  $('#submit-num-vars-button').click(function(){

    var num_dvs = parseInt($('#num-decision-variables').val());
    // remember number of decision variables for adding new constraints
    $('#add-constraint').data('n', num_dvs);

    for (var i = 0; i < num_dvs-1; i++){
      $('#of-row').find('td:last').after('<td class="of-coeff"><input type="number" value="0" size="1" /><span class="sym">x' + (i + 1) + '</span>+</td>');
      $('#nz-constraint').before('<td></td>');
    }
    $('#of-row').find('td:last').after('<td class="of-coeff"><input type="number" value="0" size="1" /><span class="sym">x' + (num_dvs)+ '</span></td>');
    $('#nz-constraint').before('<td></td>');

    var newRow = constraintRow(num_dvs);
    $('#nz-row').before(newRow);

    $('#initial-input-container').slideUp();
    $('#inputs-container').show();  

    $('#solve-button').show();
    
  });

  // submit objective function and constaints
  // show the standard-form equalities
  $('#solve-button').click(function(){

    console.log("solving...");

    parseInput();

    disableInputs();
    

    // create standard from tableau with slack variables
    createOriginalTableau(initial_objective_function, constraints);

    if (min){
      convertToMax(original_tableau);
      $('#standard-form-container').append('<p>Converted to maximization problem (multiplied objective function by -1)</p>');
    }


    var original_table = createTableauElement(original_tableau);
    $('#standard-form-container').append(original_table);


    if (checkUnbounded(original_tableau)){

      // done.
      $('#standard-form-container').append('<p style="color:red;">Problem is unbounded.</p>');

      $('#phase-one-container').parent().hide();
      $('#phase-two-container').parent().hide();
      $('#optimal-solution-container').parent().hide();

      $('#solution-container').show();
      $('#solve-button').hide();
      return;
    }

    var num_artificial_vars = createPhaseOneTableau();

    // no bfs, must create and solve phase 1 problem first
    if (num_artificial_vars > 0){

      $('#phase-one-container').append('<p>Initial problem does not have a trivial solution; forming phase 1 problem by adding artificial variables.</p>');


      var p1_table = createTableauElement(phase1_tableau);
      $('#phase-one-container').append('<h2>Initial Phase 1 Tableau:</h2>');
      $('#phase-one-container').append(p1_table);
      createCanonicalPhaseOne(phase1_tableau);
      var p1_table = createTableauElement(phase1_tableau);
      $('#phase-one-container').append('<h2>Canonical Phase 1 Tableau (aritifical vars made basic):</h2>');
      $('#phase-one-container').append(p1_table);

      var pivot_n = 1;
      var done;
      // returns true when final tableau is formed
      while(1){
        done = computeNext(phase1_tableau);

        if(done){
          break;
        }

        var p1_table = createTableauElement(phase1_tableau);
        $('#phase-one-container').append('<p>Phase 1, Pivot '+ pivot_n + ':</p>');
        $('#phase-one-container').append(p1_table);
        pivot_n++;


      }

      if (checkFeasibility(phase1_tableau)){
        $('#phase-one-container').append('<p>Phase 1 is feasible; artificial variables brought to 0. forming phase 2.</p>');
        createPhaseTwoTableau();

        var p2_table = createTableauElement(phase2_tableau);
        $('#phase-two-container').append('<p>Phase Two: Original objective function, artificial variables removed, basic variables from Phase 1 brought in.</p>');
        $('#phase-two-container').append(p2_table);


      }else{
        $('#phase-one-container').append('<p style="color:red;">Artificial variables could not be brought to zero. Phase 1 is not feasible; therefore original problem is not feasible.</p>');
        
        $('#phase-two-container').parent().hide();
        $('#optimal-solution-container').parent().hide();

        $('#solution-container').show();
        $('#solve-button').hide();
        return;
      }


    }else{

      $('#phase-one-container').append('<p>Trivial (x1...n = 0) Basic Feasible Solution is available; optimal solution can be found.</p>');
      phase2_tableau = original_tableau;
    }


    // // returns true when final tableau is formed
    var pivot_n = 1;

    // returns true when final tableau is formed
    var done;
    while(1){
      done = computeNext(phase2_tableau);

      if(done){
        break;
      }

      var p2_table = createTableauElement(phase2_tableau);
      $('#phase-two-container').append('<p>Phase 2, Pivot '+ pivot_n + ':</p>');
      $('#phase-two-container').append(p2_table);
      pivot_n++;

    }

   // optimal_solution = phase2_tableau.matrix[0][phase2_tableau.matrix[0].length - 1] / phase2_tableau.matrix[0][0] ;
   // optimal_solution = +optimal_solution.toFixed(2);

    var optimal_solution = solution(phase2_tableau);

    $('#optimal-solution-container').append('<p>Optimal Solution: </p>');


    for (var i = 0; i < optimal_solution.length; i++){

      var sym = optimal_solution[i][0];
      var val = optimal_solution[i][1];

      $('#optimal-solution-container').append('<p>' + sym + ' = ' + val + ' </p>');
    }


    //$('#optimal-solution-container').append(optimal_solution);


    $('#solution-container').show();
    $('#solve-button').hide();
  
  });




  $('#add-constraint').click(function(){

    var num_vars = parseInt($('#add-constraint').data('n'));

    var newRow = constraintRow(num_vars);
    $('#nz-row').before(newRow);
  });

  $('#inputs-table').on('click', '.remove-constraint', function(){
    $(this).parent().parent().remove();
  });


  
});



function createTableauElement (tableau){
  var table = $('<table class="text-left"></table>');
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


// optionally pass values when reading from file to prepopulate the row
function constraintRow(n, values){

  var constraint= $('<tr class="constraint-coeffs"><td></td><td><a class="remove-constraint" style="color:red;">X</a></td></tr>');


  for (var i = 0; i < n-1; i++){
    var v = values? values[i] : 0;
    constraint.append('<td class="constraint-coeff"><input type="number" value="'+ v + '" size="1" /><span class="sym">x' + (i+1) + '</span>+</td>');
  }
  var v = values? values[n-1] : 0;
  constraint.append('<td class="constraint-coeff"><input type="number" value="'+ v +'" size="1" /><span class="sym">x' + (n) + '</span></td>');

  // select >= 
  var selected = "";
  if (values && values[n] == '>='){
    selected= "selected";
  }

  var select= $('<td class="constraint-sign"><select value="-1"><option value="1"> <= </option><option value="-1" '+selected+'> >= </option></select></td>');
  constraint.append(select);

  var rhs_v = values? values[n+1] : 0;



  var rhs_td = $('<td class="rhs-coeff"><input type="number" value="'+ rhs_v +'" min="0" size="1" /></td>');
  constraint.append(rhs_td);

  return constraint;

}

function parseInput(){
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

      var rhs_coeff = parseFloat(row.find('.rhs-coeff').first().find('input').val());

      var ineq = new Inequality(constraintRow, sign, rhs_coeff);
      constraints.push(ineq);

    });
}


function disableInputs(){
  // replace inputs with their values
  $('.constraint-coeff').each(function(){

    var sym = " " + $(this).find('.sym').first().text() + " ";
    var val = parseFloat($(this).find(':input[type="number"]').first().val());

    var previous = $(this).prev().attr("class") == 'constraint-coeff';

    var sign = (val < 0 ) ? " - " : ( (previous) ? " + " : " "); 

    if(val == 0){
      $(this).html(" ");
    }else if (val == -1){
        $(this).html(sign + sym);
    }else if (val == 1){
        $(this).html(sign + sym);
    }else{
        $(this).html(sign + Math.abs(val) + sym);  
    }



  });


  $('.of-coeff').each(function(){

    var sym = " " + $(this).find('.sym').first().text() + " ";
    var val = parseFloat($(this).find(':input[type="number"]').first().val());

    var previous = $(this).prev().attr("class") == 'of-coeff';

    var sign = (val < 0 ) ? " - " : ( (previous) ? " + " : " "); 

    if(val == 0){
      $(this).html(" ");
    }else if (val == -1){
        $(this).html(sign + sym);
    }else if (val == 1){
        $(this).html(sign + sym);
    }else{
        $(this).html(sign + Math.abs(val) + sym);  
    }



  });

  $('.rhs-coeff').each(function(){
    var val = parseFloat($(this).find(':input[type="number"]').first().val());
    $(this).html(val);
  });

  $('.constraint-sign').each(function(){
    var text = $(this).find('select option:selected').text(); 
    $(this).find('select').first().replaceWith(text);
  });
  $('#min-max-select').replaceWith($('#min-max-select').val());
  $('#add-constraint').hide();


  $('.remove-constraint').each(function(){
    $(this).html("");
  });



}