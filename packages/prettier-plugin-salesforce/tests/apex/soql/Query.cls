public class Query{
public static List<Account> load(Boolean active){
List<Account> rows=[SELECT Id,Name FROM Account WHERE Name!=null LIMIT 5];
if(active&&rows.size()>0){return rows;}
return new List<Account>();
}}
