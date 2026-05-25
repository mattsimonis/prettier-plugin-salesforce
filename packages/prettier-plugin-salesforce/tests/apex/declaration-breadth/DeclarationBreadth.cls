/** outer declaration doc */
@IsTest
private with sharing class DeclarationBreadth {
/** interface doc */
@TestVisible
private interface Worker {
void run();
}

/** enum doc */
private enum Mode {
Fast,
Slow
}

/** inner class doc */
@TestVisible
private class InnerWorker {
/** method doc */
@AuraEnabled(cacheable=true)
public static String loadName(Id accountId){return 'A';}
}
}
