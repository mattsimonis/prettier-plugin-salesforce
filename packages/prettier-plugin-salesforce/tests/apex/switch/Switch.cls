public class Switch{
public static String label(Integer i,List<String> values){
switch on i{
when 0,1{if(values.isEmpty()){return 'one';}else{return values[0];}}
when else{try{for(String value:values){if(value!=null){do{return value;}while(false);}}}catch(Exception ex){System.debug(ex.getMessage());}finally{System.debug('fallback');}}
}
return 'other';
}}
