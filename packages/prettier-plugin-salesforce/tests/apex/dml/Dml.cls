public class Dml{
public static void save(List<Account> rows){
for(Account row:rows){
row.Name='A';
}
Account a=new Account(Name='A');
insert a;
if(a.Name!=null){update a;}
delete a;
}}
