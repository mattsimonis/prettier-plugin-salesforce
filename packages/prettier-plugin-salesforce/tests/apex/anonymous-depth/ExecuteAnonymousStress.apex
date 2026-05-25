// seed values with inline comments and control flow
Integer total = 0;
Integer nonNullCount = 0;
List<Account> rows = new List<Account>();
rows.add(new Account(Name = 'Acme'));
rows.add(new Account(Name = 'Beta'));
rows.add(new Account());
Map<String, Integer> counters = new Map<String, Integer>();
for (Integer i = 0; i < rows.size(); i++) {
  Account row = rows[i];
  if (row.Name == null) {
    counters.put('null-name', (counters.containsKey('null-name') ? counters.get('null-name') : 0) + 1);
    continue;
  } else if (row.Name.startsWith('B')) {
    counters.put('starts-with-b', (counters.containsKey('starts-with-b') ? counters.get('starts-with-b') : 0) + 1);
  } else {
    counters.put('other', (counters.containsKey('other') ? counters.get('other') : 0) + 1);
  }
  nonNullCount++;
  total += i;
}
switch on nonNullCount {
  when 0 {
    System.debug('none');
  }
  when 1, 2 {
    System.debug('few');
  }
  when else {
    System.debug('many');
  }
}
try {
  for (Account row : rows) {
    if (row.Name != null) {
      row.Description = 'processed';
    }
  }
  upsert rows;
} catch (DmlException ex) {
  System.debug(ex.getMessage());
} finally {
  System.debug('done total=' + total + ' nonNull=' + nonNullCount);
}
