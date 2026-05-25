public class QueryCommentAssignment{
public static Account load(List<Id> ids){
// bind the first requested id
Account first=[SELECT Id,Name FROM Account WHERE Id=:ids[0] LIMIT 1];
/* refresh after setup */
first=[SELECT Id,Name FROM Account WHERE Id=:first.Id LIMIT 1];
return first;
}}
