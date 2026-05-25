public class MixedNestedSwitch{
public static void run(Boolean runNow,List<Account> rows){
switch on rows.size(){
when 0,1{try{for(Account row:rows){do{row.Count__c+=1;}while(runNow&&row.Count__c<2);}}catch(Exception ex){System.debug(ex.getMessage());}finally{System.debug('done');}}
when else{while(runNow){break;}}
}
}}
