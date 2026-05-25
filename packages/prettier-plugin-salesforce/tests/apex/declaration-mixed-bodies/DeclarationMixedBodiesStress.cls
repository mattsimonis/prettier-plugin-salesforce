@IsTest
public with sharing class DeclarationMixedBodiesStress {
  public interface Runner {
    void run(List<Account> rows);
    Integer size();

    class InlineWorker {
      public Integer weight() {
        Integer result = 0;
        for (Integer i = 0; i < 3; i++) {
          result += i;
        }
        return result;
      }
    }
  }

  public enum Mode {
    Fast(1),
    Slow(2),
    Turbo(3);

    private final Integer score;

    private Mode(Integer value) {
      score = value;
    }

    public Integer weight() {
      return score;
    }
  }

  @TestVisible
  private static String token { get; set; }

  @AuraEnabled(cacheable=true)
  public static Integer summarize(List<Account> rows) {
    Integer total = 0;
    if (rows == null) {
      return total;
    }
    for (Account row : rows) {
      if (row.Name == null) {
        continue;
      }
      total += row.Name.length();
    }
    return total;
  }

  private class WorkerImpl implements Runner {
    public void run(List<Account> rows) {
      for (Account row : rows) {
        if (row.Name != null) {
          System.debug(row.Name);
        }
      }
    }

    public Integer size() {
      return 1;
    }
  }
}
