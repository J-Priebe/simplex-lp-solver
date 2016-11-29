$(document).ready(function(){ 

  $('#file-input').on('change', function(evt){

    var f = evt.target.files[0]; 

    if (!f) {
      alert("Failed to load file");
     
    } else if(!f.type.match('text.*')){
      $(this).val(null);
      alert("Not a valid text file.");

    }else { 
      var r = new FileReader();
      r.onload = function(e) { 
        var contents = e.target.result;
        contents = contents.trim();
        var lines = contents.split("\n");
        setInput(lines);
      }
      r.readAsText(f);
    }

  });




});



  // parse and create input table as if it were input manually
  function setInput(lines){

    min = lines[0];

    $('#min-max-select').val(min);

    var z_row = lines[1].split(" ");

    var num_dvs = z_row.length;

    // remember number of decision variables for adding new constraints
    $('#add-constraint').data('n', num_dvs);

    for (var i = 0; i < num_dvs-1; i++){
      $('#of-row').find('td:last').after('<td class="of-coeff"><input type="number" value="'+ z_row[i] + '" size="1" /><span class="sym">x' + (i + 1) + '</span>+</td>');
      $('#nz-constraint').before('<td></td>');
    }
    $('#of-row').find('td:last').after('<td class="of-coeff"><input type="number" value="' + z_row[num_dvs-1] +'" size="1" /><span class="sym">x' + num_dvs + '</span></td>');
    $('#nz-constraint').before('<td></td>');

    for (var i = 2; i < lines.length; i ++){
      var constraint_coeffs = lines[i].split(" ");
      var newRow = constraintRow(num_dvs, constraint_coeffs);
      $('#nz-row').before(newRow);
    }

    $('#initial-input-container').slideUp();
    $('#inputs-container').show();  
    $('#solve-button').show();

  }

