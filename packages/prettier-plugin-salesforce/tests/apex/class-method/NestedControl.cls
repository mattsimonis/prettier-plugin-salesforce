public class NestedControl{
public static void run(Boolean runNow,List<Account> rows){
if(runNow){
switch on rows.size(){
when 0{System.debug('none');}
when else{try{for(Account row:rows){if(row.Name!=null){do{update row;}while(false);}}}catch(Exception ex){System.debug(ex.getMessage());}finally{System.debug('done');}}
}
}else{System.debug('skip');}
}}
