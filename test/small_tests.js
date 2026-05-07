import {quicksql, toDDL} from "../src/ddl.js";


var assertionCnt = 0;

function assert( condition ) {
    if( !eval(condition) ) {
        console.error("Failed: "+condition);
        throw new Error('Test failed');
    } 
    assertionCnt++; 
}

var output;
var output1;
var src;

export default function small_tests() {

    output = toDDL(   // 1.1.5 compatible but deprecated function call
        `departments
            name
# settings = {"prefix": "RIGHT"}  
        `, 
        '{"prefix": "WRONG"}'
    );

    assert( "0 < output.indexOf('create table right_departments')" );
    //                                         ^^^^     

    output = new quicksql(
        `Bug35683432
            name
        `, 
        '{"notAnOption1": "should raise an Error"}'
    ).getDDL();
    assert( "0 < output.indexOf('Unknown setting: notanoption1')" );


    output = new quicksql(
        `Bug35683432
            name
# settings = {"notAnOption2": "should raise an Error"}            ` 
    ).getDDL();
    assert( "0 < output.indexOf('Unknown setting: notanoption2')" );

    output = new quicksql(
        `departments
            name
        # settings = {"genpk": false}            
        `
    ).getDDL();

    assert( "-1 == output.indexOf('ID     NUMBER GENERATED'.toLowerCase())" );
 
    output = new quicksql(
        `departments
            name
        # settings = {genpk: false}            
        `
    ).getDDL();

    assert( "-1 == output.indexOf('ID     NUMBER GENERATED'.toLowerCase())" );
 
    // ddl.setOptionValue('genpk',false);
    output = new quicksql(
        `departments
            name
        `,
        '{ "genpk": false }'
    ).getDDL();

    assert( "-1 == output.indexOf('ID     NUMBER GENERATED'.toLowerCase())" );

    output = new quicksql(`
departments
    name
# settings = { "api": true }
`, '{ "api": false }').getDDL();

    assert( "0 < output.indexOf('DEPARTMENTS_API'.toLowerCase())" );

    output = new quicksql(`
departments
        name
    # settings = { "Compress": "yEs" }
    `).getDDL();

    assert( "0 < output.indexOf(') compress;')" );
    
    output = new quicksql(`
Bug35650456
    name  vc32k
    `).getDDL();

    assert( "0 < output.indexOf('name    varchar2(32767 char)')" );

    output = new quicksql(`
Bug35668454
# settings = { drop: "Y"}
    `).getDDL();
           
    assert( "0 <= output.indexOf('drop table bug35668454')" ); 
    
    output = new quicksql(`
Bugs35692739_35692703_35692625
   inventory json
   name vc50
   description vc(255)
   date_creation timestamp
   date_packed tstz
   date_production timestamp with local time zone
        `).getDDL();
                   
    assert( "0 < output.indexOf('clob check (inventory is json)')" );
    assert( "0 < output.indexOf('varchar2(50 char),')" );
    assert( "0 < output.indexOf('varchar2(255 char)')" );
    assert( "0 < output.indexOf('date_creation      timestamp,')" );
    assert( "0 < output.indexOf('date_packed        timestamp with time zone,')" );
    assert( "0 < output.indexOf('date_production    timestamp with local time zone')" );
    
    output = new quicksql(`
Bug35683307 /insert 1
  # settings = { inserts: false}
            `).getDDL();

    assert( "-1 == output.indexOf('insert into')" );

    // NOTE: This test can't be performed anymore since it uses an internal method of ddl.js
    /*output = new quicksql(`
ER_35698875 
      # settings = { inserts: false}
                `);
    
    assert( !ddl.appliedOptions['inserts'].value);*/
    //console.log(ddl.getOptionValue('inserts'));
    //console.log(ddl.appliedOptions['inserts'].value);

    output = new quicksql(`
Bug_35683200 /insert 1
view bv Bug_35683200
# settings = { inserts: false}
# settings = { "schema": "HR"}
    `, '{"prefix": "The"}').getDDL();

    assert( "0 < output.indexOf('create table hr.the_Bug_35683200')" );
    assert( "0 < output.indexOf('replace view hr.the_bv')" );
    assert( "0 < output.indexOf('# settings = {\"inserts\":false,\"prefix\":\"The\",\"schema\":\"HR\"}')" );
    
    output = new quicksql(`
Bug_35677264
   product
   amt number
   qty number

# settings = { PK: "GUID", semantics: "CHAR", language: "EN", APEX: true }
    `).getDDL();

    assert( "0 < output.indexOf('number default on null to_number(sys_guid(), ')" );
    assert( "0 < output.indexOf('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')" );
    
    output = new quicksql(`
Bug_35677301

# settings = { semantics: "CHAR", auditCols: true, language: "EN", APEX: true, createdCol: "created_col", createdByCol: "created_by_col", updatedCol: "updated_col", updatedByCol: "updated_by_col" }
    `).getDDL();

    assert( "0 < output.indexOf('created_col')" );
    assert( "0 < output.indexOf('created_by_col')" );
    assert( "0 < output.indexOf('updated_col')" );
    assert( "0 < output.indexOf('updated_by_col')" );

    output = new quicksql(`
Bug35714241
    proficiency /check 'Test'
    `).getDDL();
    
    assert( "0 < output.indexOf(\"in ('Test'\")" );
   
    // 35714343
    output = new quicksql(`
departments
    dname
    emp
        department_id /fk departments
        ename
    `).getDDL();
    
    assert( " output.indexOf('department_id    number') ==  output.lastIndexOf('department_id    number') " );

    // 35715610
    output = new quicksql(`
dept
    dname
    emp /cascade
        dept_id
        ename
    `).getDDL();
    
    assert( "0 < output.indexOf('dept_id    number')" );
    assert( "0 < output.indexOf('constraint emp_dept_id_fk')" );
    assert( "0 < output.indexOf('references dept on delete cascade')" );

    // 35724078
    output = new quicksql(`
dept
    name
    
    --- toDDL() second parameter:
    # settings = {"apex":"Y","api":"N","auditcols":"N","compress":"N","date":"DATE","db":"19c","drop":"N","editionable":"N","genpk":"Y","inserts":"Y","language":"EN","longvc":null,"pk":"IDENTITY","prefix":null,"prefixpkwithtname":"N","rowkey":"N","rowversion":"N","schema":null,"semantics":"CHAR","createdcol":"created","createdbycol":"created_by","updatedcol":"updated","updatedbycol":"updated_by"} 
    `,
    '{"apex":"Y","api":"N","auditcols":"N","compress":"N","date":"DATE","db":"19c","drop":"N","editionable":"N","genpk":"Y","inserts":"Y","language":"EN","longvc":null,"pk":"IDENTITY","prefix":null,"prefixpkwithtname":"N","rowkey":"N","rowversion":"N","schema":null,"semantics":"CHAR","createdcol":"created","createdbycol":"created_by","updatedcol":"updated","updatedbycol":"updated_by"}'
    ).getDDL();
    //assert( "0 < output.indexOf('# settings = {\"apex\":\"Y\",\"db\":\"19c\",\"pk\":\"IDENTITY\"}')" );
    assert( "0 < output.indexOf('# settings = {\"apex\":\"Y\",\"db\":\"19c\",\"pk\":\"IDENTITY\"}')" );

    output = new quicksql(`
dept /insert 5
    name
# inserts : N`,'{"inserts":"N"}').getDDL();

    assert( "0 > output.indexOf('# inserts : N')" );
    
    output = new quicksql(`
Bug35737572
    flight_json json
    `).getDDL();

    assert( "0 < output.indexOf('clob check (flight_json is json)')" );
     
    output = new quicksql(`
Bug35737578
    flight_file file
    `).getDDL();
   
    assert( "0 < output.indexOf('flight_file_filename')" );
         
    output = new quicksql(`
bug35748389
    name
    
    # settings = {"pk":"NONE"}
    `).getDDL();
   
    assert( "output.indexOf('trigger') < 0" );
    assert( "0 < output.indexOf('constraint bug35748389_id_pk primary key,')" );
         
    output = new quicksql(`
bug35748389_2
    name
    
    # settings = {"pk":"seq"}
    `).getDDL();
   
    assert( "output.indexOf('trigger') < 0" );
    assert( "0 < output.indexOf('number default on null bug35748389_2_seq.nextval')" );
    assert( "0 < output.indexOf('constraint bug35748389_2_id_pk primary key,')" );
         
    output = new quicksql(
    `bug35748389_3
        name
    
    # settings = {"genpk":false}
    `).getDDL();
   
    assert( "output.indexOf('trigger') < 0" );
    assert( "output.indexOf('id') < 0" );
         
    output = new quicksql(
    `bug35748389_4
        name
    
    # settings = {"pk":"identity"}
    `).getDDL();
   
    assert( "output.indexOf('trigger') < 0" );
    assert( "0 < output.indexOf('number generated by default on null as identity')" );
    assert( "0 < output.indexOf('constraint bug35748389_4_id_pk primary key,')" );
 
    output = new quicksql(
    `Bug 35756025
    deptno                         num(2,0)  /nn /pk 
    dname                          vc(14) 
    loc                            vc(13) 
    `).getDDL();
       
    assert( "0 < output.indexOf('number(2,0) default on null to_number(sys_guid(), ')" );
    assert( "0 < output.indexOf('constraint bug_35756025_deptno_pk primary key,')" );

    output = new quicksql(
    `Bug 35757130
    file_name                      vc(512) 
    file_mimetype                  vc(512) 
    file_charset                   vc(512) 
    file_lastupd                   date 
    file_blob                      blob 
    file_comments                  vc(4000) 
    tags          `).getDDL();
           
    assert( "0 < output.indexOf('file_name        varchar2(512 char),')" );
    assert( "output.indexOf('file_mimetype_mimetype') < 0" );
    assert( "output.indexOf('file_lastupd_filename') < 0" );
    
    output = new quicksql(
    `Bug35737917 /auditcols
        name
    # settings = {"apex":"false"}
    `, '{"apex":"true"}').getDDL();
               
    assert( "0 < output.indexOf(':new.created_by := user;')" );
    assert( "output.indexOf('APEX$SESSION') < 0" );

    output = new quicksql(
    `Bug35757000 
            name
    # settings = {"overrideSettings":"true"}
    `, '{"prefix":"X"}').getDDL();
                   
    assert( "output.indexOf('x_') < 0" );
    
    output = new quicksql(
    `Bug35650456_2
        job vc5000
    
    --- Non-default options:
    # settings = {"apex":"Y","db":"19c","longvc":"N"}
    `).getDDL();
             
    assert( " output.indexOf('Non-default options') ==  output.lastIndexOf('Non-default options') " );

    // Bug 35775121
    output = new quicksql( 
`dept
    name

emp
    dept_id /cascade
    name
    `).getDDL();
                          
    assert( " 0 < output.indexOf('constraint emp_dept_id_fk') " );
    assert( " 0 < output.indexOf('references dept on delete cascade,') " );
    assert( " output.indexOf('dept_id    integer') < 0 " );
    
    output = new quicksql( 
        `demo_item_order
            comment vc80`).getDDL();
                
    assert( " 0 < output.indexOf('the_comment') " );

    output = new quicksql( 
`team_members /insert 1
    username /nn /upper
projects /insert 1
    name /nn
    project_lead /nn /references team_members`).getDDL();
                                      
    output = new quicksql( 
`person
    id num /pk
    name vc40
    date_of_birth date
    mother /fk person
    father /fk person
    `).getDDL();
                                                  
    assert( " 0 < output.indexOf('id               number') " );    
    //////////////////////////////id           number 
    assert( " 0 < output.indexOf('person_id_pk primary key') " );    

    output = new quicksql( 
`countries
    code vc2 /pk
    `).getDDL();
    assert( " 0 < output.indexOf('code    varchar2(2 char) not null') " ); 

    output = new quicksql( 
`countries
    country_id vc2 /pk 
    `).getDDL();
    assert( " 0 < output.indexOf('country_id    varchar2(2 char) not null') " ); 
                    
    output = new quicksql( 
`Bug35827840
    col1 vc
    `).getDDL();
        
    assert( " 0 < output.indexOf('col1    varchar2(4000') " );     

    output = new quicksql( 
`Bug35827927
    colstr string
    colvarchar varchar
    colvarchar2 varchar2
    colchar char
    `).getDDL();
                
    assert( " 0 < output.indexOf('colstr    ') " );                                     
    assert( " 0 < output.indexOf('colvarchar    ') " );                                     
    assert( " 0 < output.indexOf('colvarchar2    varchar2(4000') " );                                     
    assert( " 0 < output.indexOf('colchar    ') " );   
    
    output = new quicksql( 
`Bug35814922
    important_yn
    important1 yn
    important2 bool
    is_important
    `).getDDL();
    assert( " 0 < output.indexOf('important_yn    varchar2(1') " );                                     
    assert( " 0 < output.indexOf('constraint bug35814922_important_yn') " );                                     
    assert( " 0 < output.indexOf('important1      varchar2(1')" );                                     
    assert( " 0 < output.indexOf('constraint bug35814922_important1') " );                                     
    assert( " 0 < output.indexOf('important2      varchar2(1') " );    
    assert( " 0 < output.indexOf('constraint bug35814922_important2') " );    
    assert( " 0 < output.indexOf('is_important    varchar2(1') " );    
    assert( " 0 < output.indexOf('constraint bug35814922_is_important') " );    
    
    output = new quicksql( 
`Bug35842845 
    ファーストネーム vc200 
    Das Gedöns	vc200 
    locatilon;drop user sys;
    country;shutdown abort;a  
    `).getDDL();
    assert( " 0 < output.indexOf('\"ファーストネーム\"') " );                                     
    assert( " 0 < output.indexOf('\"Das Gedöns\"') " );                                     
    //assert( " 0 < output.indexOf('\"locatilon;drop user sys;\"') " );                                     
    assert( " 0 < output.indexOf('\"country;shutdown abort;a\"') " ); 
    
    output = new quicksql( 
        `"Test" 
            "CamelCase"
            x   [coMment]  
            2   --coMment2  
    `).getDDL();

    assert( " 0 < output.indexOf('create table \"Test\"') " );                                     
    assert( " 0 < output.indexOf('Test_id_pk') " );                                     
    assert( " 0 < output.indexOf('\"CamelCase\"') " );                                     
    assert( " 0 < output.indexOf('comment on column \"Test\".x is ') " );                                     
    assert( " 0 < output.indexOf('comment on column \"Test\".x2 is ') " );                                     
         
    // 35936560
    output = new quicksql( 
    `mytable /rest
        name
    `).getDDL();
    assert( " output.indexOf('p_object')+5 < output.indexOf('MYTABLE') " );    
                                     
    output = new quicksql( 
    `"yourTable" /rest
    name      
    `).getDDL();
    assert( " output.indexOf('p_object')+5 < output.lastIndexOf('yourTable') " ); 

    output = new quicksql( 
    `customers
        cid /pk
    
    #settings = { pk: "SEQ"}      
        `).getDDL();
        
    assert( " 0 < output.indexOf('cid    number default on null customers_seq.nextval') " ); 
    assert( " output.indexOf('trigger') < 0 " ); 
                                            
    output = new quicksql( 
    `customers
        id
    `).getDDL();
        
    assert( " output.indexOf('id    varchar2') < 0 " ); 

    // https://github.com/oracle/quicksql/issues/26
    output = new quicksql( 
`dept
    name

view v dept

# settings = {prefix: "abc"}
    `).getDDL();
        
    assert( "output.indexOf('from') <  output.lastIndexOf('abc_dept') " ); 

    // https://github.com/oracle/quicksql/issues/27
    output = new quicksql( `dept
    name
        
    # settings = {prefix: "prefix", schema: "schema"}
    `).getDDL();
                    
    assert( "output.indexOf('schema.prefix_dept_id_pk') < 0 " ); 
            
    // https://github.com/oracle/quicksql/issues/28
    output = new quicksql( `# settings = {"pk":"GUID"}
students /insert 2 
        name
    `).getDDL();
                    
    assert( "output.indexOf('trigger') < 0 " ); 
    assert( "output.indexOf('alter') < 0 " ); 

    // https://github.com/oracle/quicksql/issues/29
    output = new quicksql( `employees /insert 1
       date hired
   
   #settings={ date:timestamp}
    `).getDDL();
                       
    assert( "output.indexOf('N/A') < 0 " );  

    // https://github.com/oracle/quicksql/issues/31
    output = new quicksql( `departments /audit cols
   name 
   employees /audit columns
       name 
    `).getDDL();
                   
    assert( "0 < output.indexOf(\"department_id\")" );
    assert( "output.indexOf('audit all') < 0 " );  
    assert( "output.indexOf('created       date not null') <  output.lastIndexOf('created          date not null,')" );  

    // https://github.com/oracle/quicksql/issues/32
    output = new quicksql( `queues
    created /default sysdate
    created dt /default systimestamp
    `).getDDL();
                   
    assert( "0 < output.indexOf('default on null sysdate')" );  
    assert( "0 < output.indexOf('default on null systimestamp')" );  

    // https://github.com/oracle/quicksql/issues/32
    output = new quicksql( `# pk: SEQ
    # drop: Y
students 
    name
    `).getDDL();
                   
    assert( "0 < output.indexOf('drop sequence students_seq')" );  

    // https://github.com/oracle/quicksql/issues/42
    output = new quicksql( `test
    approved boolean /default N
    `).getDDL();
                       
    assert( "0 < output.indexOf(\"default on null 'N'\")" );   

    // https://github.com/oracle/quicksql/issues/43
    output = new quicksql( `test
        foo_id int /nn /fk foo
    `).getDDL();
                           
    assert( "0 < output.indexOf(\"foo_id    integer\")" );      

    // https://github.com/oracle/quicksql/issues/46
    output = new quicksql( `test
        test_name
        test_description
        test_number
        test_date
    `).getDDL();
                           
    assert( "0 < output.indexOf(\"test_name           varchar2(255\")" );      
    assert( "0 < output.indexOf(\"test_description    varchar2(4000\")" );      
    assert( "0 < output.indexOf(\"test_number         number\")" );      
    assert( "0 < output.indexOf(\"test_date           date\")" );      

    // https://github.com/oracle/quicksql/issues/48
    output = new quicksql( `support
    support_email vc100 /default support@oracle.com
    `).getDDL();
                           
    assert( "0 < output.indexOf(\"support_email    varchar2(100 char) default on null 'support@oracle.com'\")" );      

    // https://github.com/oracle/quicksql/issues/49
    output = new quicksql( `change_history
    data_type vc20 /check VARCHAR2,CLOB,TSWLTZ
    `).getDDL();
                           
    assert( "0 < output.indexOf(\"data_type    varchar2(20\")" );      

    // https://github.com/oracle/quicksql/issues/51
    output = new quicksql( `foo
    bar /boolean /default y
    `).getDDL();
                        
    assert( "0 < output.indexOf(\"varchar2(1 char) default on null 'y'\")" );   
    assert( "0 < output.indexOf(\"constraint foo_bar check (bar in ('Y','N'))\")" );   
    
    // https://github.com/oracle/quicksql/issues/47
    output = new quicksql( `employee /UK first_name, last_name
    first_name
    last_name `).getDDL();
                       
    assert( "0 < output.indexOf(\"alter table employee add constraint employee_uk unique (first_name,last_name);\")" );    

    // https://github.com/oracle/quicksql/issues/47
    output = new quicksql( `employee /pk first_name, last_name
    first_name
    last name
    job history
        start_date
        end_date
    `).getDDL();
                        
     assert( "output.indexOf(\"employee_id\") < 0" );   // neither in employees and job_history tables
    assert( "0 < output.indexOf(\"alter table employee add constraint employee_pk primary key (first_name,last_name);\")" );    
    assert( "0 < output.indexOf(\"constraint employee_job_history_fk foreign key (first_name,last_name) references employee;\")" );  
    
    // https://github.com/oracle/quicksql/issues/52
    output = new quicksql(`dept
    dname
    emp /setnull
        dept_id
        ename
    `).getDDL();
    
    assert( "0 < output.indexOf('dept_id    number')" );
    assert( "0 < output.indexOf('constraint emp_dept_id_fk')" );
    assert( "0 < output.indexOf('references dept on delete set null')" );

    output = new quicksql(`dept
    dname
    # settings = {"prefix": "abc_"} 
    `).getDDL();
    
    assert( "0 < output.indexOf('abc_dept')" );
    assert( "output.indexOf('abc__dept') < 0 " );  

    output = new quicksql(`dept
     dname
    `).getDDL();

    assert( "0 < output.indexOf('number default on null to_number(sys_guid()')" );

    // https://github.com/oracle/quicksql/issues/51
    output = new quicksql(`boolvalues
    is_legal
    finished_yn
    ok   bool
    yes  boolean
    #db:"23"`).getDDL();

    assert( "0 < output.indexOf('is_legal       boolean,')" );
    assert( "0 < output.indexOf('finished_yn    boolean,')" );
    assert( "0 < output.indexOf('ok             boolean,')" );
    assert( "0 < output.indexOf('yes            boolean')" );

    // https://github.com/oracle/quicksql/issues/51
    output = new quicksql(`boolvalues
    is_legal
    finished_yn
    ok   bool
    yes  boolean
    #db:"23c"`).getDDL();

    assert( "0 < output.indexOf('is_legal       boolean,')" );
    assert( "0 < output.indexOf('finished_yn    boolean,')" );
    assert( "0 < output.indexOf('ok             boolean,')" );
    assert( "0 < output.indexOf('yes            boolean')" );
    // https://github.com/oracle/quicksql/issues/51
    output = new quicksql(`boolvalues
    is_legal
    finished_yn
    ok   bool
    yes  boolean
    #db:"23.1.1"`).getDDL();

    assert( "0 < output.indexOf('is_legal       boolean,')" );
    assert( "0 < output.indexOf('finished_yn    boolean,')" );
    assert( "0 < output.indexOf('ok             boolean,')" );
    assert( "0 < output.indexOf('yes            boolean')" );
    // 26ai db version
    output = new quicksql(`boolvalues
    is_legal
    finished_yn
    ok   bool
    yes  boolean
    #db:"26ai"`).getDDL();

    assert( "0 < output.indexOf('is_legal       boolean,')" );
    assert( "0 < output.indexOf('finished_yn    boolean,')" );
    assert( "0 < output.indexOf('ok             boolean,')" );
    assert( "0 < output.indexOf('yes            boolean')" );

    output = new quicksql(`boolvalues
    ok   bool
    #boolean:yn
    #db:"26ai"`).getDDL();
    assert( "output.indexOf('ok    boolean') < 0" );

    // https://github.com/oracle/quicksql/issues/51
    output = new quicksql(`boolvalues
        ok   bool
        #boolean:native`).getDDL();
    assert( "0 < output.indexOf('ok    boolean')" );

    output = new quicksql(`boolvalues
    ok   bool
    #boolean:yn
    #db:"23c"`).getDDL();
    assert( "output.indexOf('ok    boolean') < 0" );

    // reserved word table name should not get "the_" prefix when user prefix is set
    output = new quicksql(`comment
    text
    # settings = {"prefix":"app"}`).getDDL();
    assert( "0 < output.indexOf('app_comment')" );
    assert( "output.indexOf('the_comment') < 0" );

    output = new quicksql(`comment
    text`).getDDL();
    assert( "0 < output.indexOf('the_comment')" );

    // /flashback directive (Flashback Data Archive)
    output = new quicksql(`departments /flashback
    name`).getDDL();
    assert( "0 < output.indexOf('alter table departments flashback archive;')" );

    output = new quicksql(`departments /flashback myarchive
    name`).getDDL();
    assert( "0 < output.indexOf('alter table departments flashback archive myarchive;')" );

    // /fda alias
    output = new quicksql(`departments /fda
    name`).getDDL();
    assert( "0 < output.indexOf('alter table departments flashback archive;')" );

    output = new quicksql(`departments /fda myarchive
    name`).getDDL();
    assert( "0 < output.indexOf('alter table departments flashback archive myarchive;')" );

    // https://github.com/oracle/quicksql/issues/55
    output = new quicksql(`escape /insert 1
    financial_year /check '23/24', \`'24/25'\`
    surname vc60 /check 'O''Hara', q'{O'Tool}'  
    start_date /check  \`to_date('01-APR-2025','DD-MON-YYYY')\``).getDDL();
    assert( "0 < output.indexOf(\"check (financial_year in ('23/24','24/25')),\")" );
    assert( "0 < output.indexOf(\"check (surname in ('O''Hara',q'{O'Tool}')),\")" );
    assert( "0 < output.indexOf(\"check (start_date in (to_date('01-APR-2025','DD-MON-YYYY')))\")" );
    assert( "output.indexOf(\"''24/25''\") < 0" );
    assert( "output.indexOf(\"q''{O''Tool}''\") < 0" );
    assert( "output.indexOf(\"to_date(''01-APR-2025'',''DD-MON-YYYY'')\") < 0" );
  
    output = new quicksql(`departments /insert 1
    name /nn
    # settings = {"prefix":"test"}`).getDDL();
    assert( "0 < output.indexOf(\"insert into test_departments (\")" );

    output = new quicksql(`# settings = {prefixPKwithTname:true, "api":"Y"}
person
    first_name 
    last_name
    first_date
addreess
    address1
    address2
    person_id`).getDDL();
    assert( "output.indexOf(\"p_id\") < 0" );
    
    output = new quicksql(`test /insert 1 /colprefix pre 
   t1    
    #drop:true
    `).getDDL();
    output = output.substring(0, output.indexOf("-- Generated by Quick SQL"));
    assert( "0 < output.indexOf(\"pre_t1\")" );
    assert( "output.indexOf(\" t1\") < 0" );

    // https://github.com/oracle/quicksql/issues/63
    output = new quicksql(`t
    s vc20 /nn /unique
    #prefix: e01
    `).getDDL();
    output = output.substring(0, output.indexOf("-- Generated by Quick SQL"));
    assert( "0 < output.indexOf(\"e01_t_id_pk\")" );
    assert( "0 < output.indexOf(\"e01_t_s_unq\")" );

   // https://github.com/oracle/quicksql/issues/65
   output = new quicksql(`reports /insert 1
   created date
   description vc20
   pdf blob 
   `).getDDL();
   output = output.substring(0, output.indexOf("-- Generated by Quick SQL"));
   assert( "output.indexOf(\"N/A\") < 0" );
   src = quicksql.lexer( output, false, true, '`' );
   assert( "src[56].value.length <= 20+2" );  // e.g. 'Eha ikuda ca balte v'"

   // https://github.com/oracle/quicksql/issues/67
   output = new quicksql(`departments 
   name 
   employees 
      name 

view emp_v departments employees
   `).getDDL();
   output = output.substring(0, output.indexOf("-- Generated by Quick SQL"));
   assert( "output.indexOf(\"departments.id/\") < 0" );

    output = new quicksql( `issue78  /insert 2
    name
    `).getDDL();
    //console.log(output);
    // src = quicksql.lexer( output, false, true, '`' );
    // src[?].value != src[?].value
    assert( "0 < output.indexOf('Landon Glover') " );
    assert( "0 < output.indexOf('Jack Jackson') " );

    // Oracle annotations - table level
    output = new quicksql(`departments {UI_Display 'Departments', Classification 'HR'}
    name`).getDDL();
    assert( "0 < output.indexOf('annotations (UI_Display')" );
    assert( "0 < output.indexOf(')\\nannotations (')" );

    // Oracle annotations - column level
    output = new quicksql(`departments
    name {UI_Display 'Department Name'}`).getDDL();
    assert( "0 < output.indexOf('annotations (UI_Display')" );
    assert( "0 < output.indexOf('char) annotations (')" );

    // Oracle annotations - flag annotation (no value)
    output = new quicksql(`departments
    code {SurrogateKey}`).getDDL();
    assert( "0 < output.indexOf('annotations (SurrogateKey)')" );

    // Oracle annotations - both comments and annotations
    output = new quicksql(`departments [Main table] {Classification 'HR'}
    name [Full name] {UI_Display 'Name'}`).getDDL();
    assert( "0 < output.indexOf('comment on table departments')" );
    assert( "0 < output.indexOf('comment on column departments.name')" );
    assert( "0 < output.indexOf('annotations (Classification')" );
    assert( "0 < output.indexOf('annotations (UI_Display')" );

    // Oracle annotations - multiple annotations on column
    output = new quicksql(`departments
    name {UI_Display 'Name', Highlight}`).getDDL();
    assert( "0 < output.indexOf('Highlight')" );
    assert( "0 < output.indexOf('UI_Display')" );

    // Oracle annotations - annotations with /nn option
    output = new quicksql(`departments
    name /nn {Format 'text'}`).getDDL();
    assert( "0 < output.indexOf('not null')" );
    assert( "0 < output.indexOf('annotations (Format')" );

    // Oracle annotations - table name is not affected
    output = new quicksql(`departments {SomeAnnotation}
    name`).getDDL();
    assert( "0 < output.indexOf('create table departments')" );

    // Oracle annotations - view level
    output = new quicksql(`dept
    name
view dept_v dept {UI_Display 'Department View'}`).getDDL();
    assert( "0 < output.indexOf('annotations (ui_display')" );
    assert( "0 < output.indexOf('view dept_v')" );

    // Oracle annotations - view with multiple annotations
    output = new quicksql(`dept
    name
view dept_v dept {Purpose 'reporting', Classification 'HR'}`).getDDL();
    assert( "0 < output.indexOf('annotations (purpose')" );
    assert( "0 < output.indexOf('classification')" );
    assert( "0 < output.indexOf(' as')" );

    // DESCRIPTION annotation generates comment on table
    output = new quicksql(`departments {DESCRIPTION 'Main HR departments table'}
    name`).getDDL();
    assert( "0 < output.indexOf('comment on table departments')" );
    assert( "0 < output.indexOf('Main HR departments table')" );
    assert( "0 < output.indexOf('annotations (DESCRIPTION')" );

    // DESCRIPTION annotation generates comment on column
    output = new quicksql(`departments
    name {DESCRIPTION 'The department name'}`).getDDL();
    assert( "0 < output.indexOf('comment on column departments.name')" );
    assert( "0 < output.indexOf('The department name')" );

    // DESCRIPTION annotation with explicit comment - DESCRIPTION wins
    output = new quicksql(`departments [Explicit comment] {DESCRIPTION 'Annotation description'}
    name`).getDDL();
    assert( "0 < output.indexOf('comment on table departments')" );
    assert( "0 < output.indexOf(\"is 'Annotation description'\")" );
    assert( "0 > output.indexOf(\"is 'Explicit comment'\")" );

    // DESCRIPTION annotation mixed with other annotations
    output = new quicksql(`departments {DESCRIPTION 'HR table', Classification 'HR'}
    name`).getDDL();
    assert( "0 < output.indexOf('comment on table departments')" );
    assert( "0 < output.indexOf('HR table')" );
    assert( "0 < output.indexOf('annotations (DESCRIPTION')" );
    assert( "0 < output.indexOf('Classification')" );

    // DESCRIPTION annotation with double quotes
    output = new quicksql(`projects {DESCRIPTION "Projects table"}
    start_date date {DESCRIPTION "Start date of the project"}`).getDDL();
    assert( "0 < output.indexOf('comment on table projects')" );
    assert( "0 < output.indexOf('Projects table')" );
    assert( "0 < output.indexOf('comment on column projects.start_date')" );
    assert( "0 < output.indexOf('Start date of the project')" );

    // /trans column directive - single table with one /trans column
    output = new quicksql(`knowledge_type
    knowledge_type vc(1024) /nn /trans
    display_order number`).getDDL();
    assert( "0 < output.indexOf('create table language')" );
    assert( "0 < output.indexOf('language_code_pk primary key')" );
    assert( "0 < output.indexOf('create table knowledge_type_trans')" );
    assert( "0 < output.indexOf('knowledge_type_id')" );
    assert( "0 < output.indexOf('language_code')" );
    assert( "0 < output.indexOf('trans_knowledge_type')" );
    assert( "0 < output.indexOf('knowledge_type_trans_uk unique')" );
    assert( "0 < output.indexOf('knowledge_type_trans_lang_fk')" );
    assert( "0 < output.indexOf('create or replace view knowledge_type_resolved')" );
    assert( "0 < output.indexOf('coalesce(t.trans_knowledge_type, k.knowledge_type)')" );
    assert( "0 < output.indexOf('k.display_order')" );
    assert( "0 < output.indexOf(\"sys_context('APP_CTX','LANG')\")" );

    // /trans on clob column - correct type in _trans table
    output = new quicksql(`articles
    title vc(200) /trans
    body clob /trans
    status vc(20)`).getDDL();
    assert( "0 < output.indexOf('trans_title')" );
    assert( "0 < output.indexOf('trans_body')" );
    assert( "0 < output.indexOf('clob')" );
    assert( "0 < output.indexOf('create or replace view articles_resolved')" );
    assert( "0 < output.indexOf('coalesce(t.trans_title, k.title)')" );
    assert( "0 < output.indexOf('coalesce(t.trans_body, k.body)')" );
    assert( "0 < output.indexOf('k.status')" );

    // /translation and /translations aliases work too
    output = new quicksql(`products
    product_name vc(200) /translation
    description vc(4000) /translations`).getDDL();
    assert( "0 < output.indexOf('create table products_trans')" );
    assert( "0 < output.indexOf('trans_product_name')" );
    assert( "0 < output.indexOf('trans_description')" );

    // Custom transcontext setting
    output = new quicksql(`items
    item_name vc(100) /trans
    # transcontext: "sys_context('MY_CTX','LANGUAGE')"
    `).getDDL();
    assert( "0 < output.indexOf(\"sys_context('MY_CTX','LANGUAGE')\")" );

    // No /trans columns -> no language table or extra output
    output = new quicksql(`simple_table
    name
    description`).getDDL();
    assert( "output.indexOf('create table language') < 0" );
    assert( "output.indexOf('_trans') < 0" );
    assert( "output.indexOf('_resolved') < 0" );

    // Feature: /immutable directive
    output = new quicksql(`inspection_p /immutable
    finding vc(200)
    severity vc(20)`).getDDL();
    assert( "0 < output.indexOf('before update or delete')" );
    assert( "0 < output.indexOf('co_immutable_err')" );
    assert( "0 < output.indexOf('raise_application_error(co_immutable_err, co_immutable_msg)')" );
    assert( "0 < output.indexOf('trg_inspection_p_insertonly')" );
    assert( "0 < output.indexOf('inspection_p is immutable')" );

    // /immutable not present -> no immutable trigger
    output = new quicksql(`regular_table
    name`).getDDL();
    assert( "output.indexOf('insertonly') < 0" );
    assert( "output.indexOf('raise_application_error') < 0" );

    // Feature: /soda directive
    output = new quicksql(`mycollection /soda`).getDDL();
    assert( "0 < output.indexOf('create table mycollection')" );
    assert( "0 < output.indexOf('id              varchar2(255 char)')" );
    assert( "0 < output.indexOf('mycollection_id_pk primary key')" );
    assert( "0 < output.indexOf('created_on      timestamp')" );
    assert( "0 < output.indexOf('last_modified   timestamp')" );
    assert( "0 < output.indexOf('version         varchar2(255 char)')" );
    assert( "0 < output.indexOf('json_document   json')" );

    // /soda with semantics: byte
    output = new quicksql(`mycollection /soda
    # settings = {"semantics":"byte"}`).getDDL();
    assert( "0 < output.indexOf('varchar2(255 byte)')" );

    // /soda with prefix
    output = new quicksql(`docs /soda
    # settings = {"prefix":"app"}`).getDDL();
    assert( "0 < output.indexOf('create table app_docs')" );
    assert( "0 < output.indexOf('json_document')" );

    // Feature: Default date expressions (unquoted)
    output = new quicksql(`events
    created_at ts /default current_timestamp
    modified_at ts /default systimestamp
    regular_col vc(20) /default hello`).getDDL();
    assert( "0 < output.indexOf('default on null current_timestamp')" );
    assert( "0 < output.indexOf('default on null systimestamp')" );
    assert( "0 < output.indexOf(\"default on null 'hello'\")" );

    // localtimestamp also unquoted
    output = new quicksql(`events2
    created_at ts /default localtimestamp`).getDDL();
    assert( "0 < output.indexOf('default on null localtimestamp')" );

    // Feature: Table groups via TGROUP annotation
    output = new quicksql(`departments {TGROUP 'HR Tables'}
    name
employees {TGROUP 'HR Tables'}
    name
projects {TGROUP 'PM Tables'}
    name`).getDDL();
    assert( "0 < output.indexOf('table groups')" );
    assert( "0 < output.indexOf(\"insert into user_annotations_groups$ (group_name) values ('HR Tables')\")" );
    assert( "0 < output.indexOf(\"insert into user_annotations_group_members$ (group_name, object_name) values ('HR Tables', 'DEPARTMENTS')\")" );
    assert( "0 < output.indexOf(\"insert into user_annotations_group_members$ (group_name, object_name) values ('HR Tables', 'EMPLOYEES')\")" );
    assert( "0 < output.indexOf(\"insert into user_annotations_groups$ (group_name) values ('PM Tables')\")" );
    assert( "0 < output.indexOf(\"insert into user_annotations_group_members$ (group_name, object_name) values ('PM Tables', 'PROJECTS')\")" );
    // TGROUP annotation still appears on table DDL
    assert( "0 < output.indexOf('annotations (TGROUP')" );

    // Feature: AI enrichment via metadata_annotations (aienrichment + db >= 26)
    // Table annotations → metadata_annotations.set()
    output = new quicksql(`departments {Classification 'HR', UI_Display 'Departments'}
    name`, '{"db":"26ai", "aienrichment":"yes"}').getDDL();
    assert( "0 < output.indexOf('AI enrichment')" );
    assert( "0 < output.indexOf(\"metadata_annotations.set('Classification', 'HR', 'DEPARTMENTS')\")" );
    assert( "0 < output.indexOf(\"metadata_annotations.set('UI_Display', 'Departments', 'DEPARTMENTS')\")" );

    // Column annotations → set() with 'TABLE COLUMN' type
    output = new quicksql(`departments
    name {UI_Display 'Department Name'}`, '{"db":"26ai", "aienrichment":"yes"}').getDDL();
    assert( "0 < output.indexOf(\"metadata_annotations.set('UI_Display', 'Department Name', 'DEPARTMENTS.NAME', 'TABLE COLUMN')\")" );

    // View annotations → set() with 'VIEW' type
    output = new quicksql(`departments
    name
view dept_v departments {UI_Display 'Department View'}`, '{"db":"26ai", "aienrichment":"yes"}').getDDL();
    assert( "0 < output.indexOf(\"metadata_annotations.set('UI_Display', 'Department View', 'DEPT_V', 'VIEW')\")" );

    // TGROUP annotations → create_group() + add_to_group()
    output = new quicksql(`departments {TGROUP 'HR Tables'}
    name
employees {TGROUP 'HR Tables'}
    name`, '{"db":"26ai", "aienrichment":"yes"}').getDDL();
    assert( "0 < output.indexOf(\"metadata_annotations.create_group('HR Tables')\")" );
    assert( "0 < output.indexOf(\"metadata_annotations.add_to_group('HR Tables', 'DEPARTMENTS', 'TABLE')\")" );
    assert( "0 < output.indexOf(\"metadata_annotations.add_to_group('HR Tables', 'EMPLOYEES', 'TABLE')\")" );

    // No enrichment when db < 26 (even with aienrichment on)
    output = new quicksql(`departments {Classification 'HR'}
    name`, '{"db":"23ai", "aienrichment":"yes"}').getDDL();
    assert( "-1 == output.indexOf('metadata_annotations')" );

    // No enrichment when db not set
    output = new quicksql(`departments {Classification 'HR'}
    name`, '{"aienrichment":"yes"}').getDDL();
    assert( "-1 == output.indexOf('metadata_annotations')" );

    // No enrichment when aienrichment not enabled
    output = new quicksql(`departments {Classification 'HR'}
    name`, '{"db":"26ai"}').getDDL();
    assert( "-1 == output.indexOf('metadata_annotations')" );

    // Flag annotations skipped (no value)
    output = new quicksql(`departments {SurrogateKey}
    name`, '{"db":"26ai", "aienrichment":"yes"}').getDDL();
    assert( "-1 == output.indexOf('metadata_annotations')" );

    // Object prefix applied correctly
    output = new quicksql(`departments {Classification 'HR'}
    name`, '{"db":"26ai", "aienrichment":"yes", "prefix":"APP"}').getDDL();
    assert( "0 < output.indexOf(\"metadata_annotations.set('Classification', 'HR', 'APP_DEPARTMENTS')\")" );

    // Feature: Views with translation awareness
    output = new quicksql(`locations
    name vc(200) /trans
    code vc(10)
    tenant_id

view location_v locations`).getDDL();
    assert( "0 < output.indexOf('coalesce(t_locations.trans_name, locations.name)')" );
    assert( "0 < output.indexOf('left join locations_trans t_locations')" );
    assert( "0 < output.indexOf(\"sys_context('APP_CTX','LANG')\")" );
    // tenant_id is just a regular column surfaced in the view
    assert( "0 < output.indexOf('locations.tenant_id')" );
    // non-translated columns come through normally
    assert( "0 < output.indexOf('locations.code')" );

    // View without /trans -> no LEFT JOIN
    output = new quicksql(`dept
    name
view dept_v dept`).getDDL();
    assert( "output.indexOf('left join') < 0" );
    assert( "output.indexOf('coalesce') < 0" );

    // -- Issue #1: Boolean native type with db >= 23 should use true/false, not 'Y'/'N'
    output = new quicksql(`
# settings = {"db":"23ai","pk":"IDENTITY"}
tenant
  is_active vc(1) /nn /check Y, N /default Y
  flag_yn boolean /default N
`).getDDL();
    assert( "0 < output.indexOf('is_active')" );
    assert( "0 < output.indexOf('boolean default on null true')" );
    assert( "output.indexOf(\"default on null 'Y'\") < 0" );
    assert( "output.indexOf(\"in ('Y','N')\") < 0" );
    assert( "0 < output.indexOf('flag_yn')" );
    assert( "0 < output.indexOf('boolean default on null false')" );

    // Boolean with db < 23 should still use varchar2 Y/N
    output = new quicksql(`
# settings = {"db":"19c","pk":"IDENTITY"}
tenant
  is_active vc(1) /nn /check Y, N /default Y
`).getDDL();
    assert( "0 < output.indexOf(\"varchar2(1\")" );
    assert( "0 < output.indexOf(\"default on null 'Y'\")" );
    assert( "0 < output.indexOf(\"in ('Y','N')\")" );

    // -- Issue #6: View FROM clause should have space between table name and alias
    output = new quicksql(`
# settings = {"prefix":"IW","pk":"IDENTITY"}
dept
    name
view dept_v dept`).getDDL();
    assert( "0 < output.indexOf('iw_dept dept')" );
    assert( "output.indexOf('iw_deptdept') < 0" );

    // -- Issue #7: Reserved word 'user' should be amended in view aliases
    output = new quicksql(`
# settings = {"prefix":"IW","pk":"IDENTITY"}
user
    username vc(50)
task
    user_id /fk user
view task_v task user`).getDDL();
    assert( "0 < output.indexOf('iw_user the_user')" );
    assert( "0 < output.indexOf('the_user.id')" );
    assert( "0 < output.indexOf('the_user.username')" );

    // -- Issue #10: View WHERE clause should use actual FK column name
    output = new quicksql(`
# settings = {"prefix":"IW","pk":"IDENTITY"}
user
    username vc(50)
visit
    planned_by /fk user
view stats_v visit user`).getDDL();
    assert( "0 < output.indexOf('left join')" );
    assert( "0 < output.indexOf('on visit.planned_by = the_user.id')" );
    assert( "output.indexOf('(+)') < 0" );

    // -- Issue #9: Duplicate column aliases should be disambiguated
    output = new quicksql(`
# settings = {"prefix":"IW","pk":"IDENTITY"}
user
    username vc(50)
auth
    user_id /fk user
view auth_v user auth`).getDDL();
    // user.id -> user_id, auth.user_id -> auth_user_id (disambiguated)
    assert( "0 < output.indexOf('auth_user_id')" );

    // -- Issue #11: SODA collection should not get a BIU trigger
    output = new quicksql(`
# settings = {"pk":"IDENTITY","rowversion":true,"auditcols":"Y","apex":"Y"}
visit_inspection_c /soda
`).getDDL();
    assert( "output.indexOf('visit_inspection_c_biu') < 0" );
    assert( "0 < output.indexOf('json_document')" );

    // -- Recommendation #13: Native JSON type for db >= 23
    output = new quicksql(`
# settings = {"db":"23ai"}
test_json
    payload json
`).getDDL();
    assert( "0 < output.indexOf('payload    json')" );
    assert( "output.indexOf('clob check') < 0" );
    assert( "output.indexOf('is json') < 0" );

    // Native JSON not used for db < 23
    output = new quicksql(`
# settings = {"db":"19c"}
test_json
    payload json
`).getDDL();
    assert( "0 < output.indexOf('clob check (payload is json)')" );

    // -- Recommendation #14: Audit date type setting (timestamp with time zone)
    output = new quicksql(`
# settings = {"auditdate":"timestamp with time zone","auditcols":"Y","apex":"Y"}
test_audit
    name
`).getDDL();
    assert( "0 < output.indexOf('timestamp with time zone not null')" );
    assert( "0 < output.indexOf('systimestamp')" );
    assert( "output.indexOf(':= sysdate') < 0" );

    // Audit date type defaults to Date Data Type when auditdate not set
    output = new quicksql(`
# settings = {"auditcols":"Y","apex":"Y"}
test_audit2
    name
`).getDDL();
    assert( "0 < output.indexOf('sysdate')" );

    // -- Recommendation #16: DROP IF EXISTS for db >= 23
    output = new quicksql(`
# settings = {"db":"26ai","drop":"Y"}
test_drop
    name
`).getDDL();
    assert( "0 <= output.indexOf('drop table if exists')" );

    // DROP without IF EXISTS for db < 23
    output = new quicksql(`
# settings = {"db":"19c","drop":"Y"}
test_drop2
    name
`).getDDL();
    assert( "0 <= output.indexOf('drop table test_drop2')" );
    assert( "output.indexOf('if exists') < 0" );

    // -- Recommendation #17: IMMUTABLE TABLE for db >= 23 uses CREATE IMMUTABLE TABLE ... NO DROP NO DELETE
    output = new quicksql(`
# settings = {"db":"23ai"}
audit_log /immutable
    finding vc(200)
`).getDDL();
    assert( "0 < output.indexOf('create immutable table audit_log')" );
    assert( "0 < output.indexOf('no drop until 0 days idle')" );
    assert( "0 < output.indexOf('no delete until 16 days after insert')" );
    // No trigger-based immutability needed for db >= 23
    assert( "output.indexOf('raise_application_error') < 0" );
    assert( "output.indexOf('insertonly') < 0" );

    // IMMUTABLE TABLE for db < 23 uses trigger-based approach
    output = new quicksql(`
# settings = {"db":"19c"}
audit_log /immutable
    finding vc(200)
`).getDDL();
    assert( "output.indexOf('create immutable table') < 0" );
    assert( "0 < output.indexOf('create table audit_log')" );
    assert( "0 < output.indexOf('raise_application_error')" );
    assert( "0 < output.indexOf('insertonly')" );

    // -- Recommendation #18: VECTOR INDEX for db >= 23
    output = new quicksql(`
# settings = {"db":"26ai"}
documents
    title vc(200)
    embedding vector
`).getDDL();
    assert( "0 < output.indexOf('create vector index')" );
    assert( "0 < output.indexOf('organization neighbor partitions')" );
    assert( "0 < output.indexOf('with distance cosine')" );

    // No vector index for db < 23
    output = new quicksql(`
# settings = {"db":"19c"}
documents
    title vc(200)
    embedding vector
`).getDDL();
    assert( "output.indexOf('create vector index') < 0" );

    // -- Recommendation #22: COMPRESS ADVANCED for db >= 23
    output = new quicksql(`
# settings = {"db":"26ai","compress":"Y"}
big_table
    name
`).getDDL();
    assert( "0 < output.indexOf('row store compress advanced')" );
    assert( "output.indexOf(') compress;') < 0" );

    // Regular compress for db < 23
    output = new quicksql(`
# settings = {"db":"19c","compress":"Y"}
big_table2
    name
`).getDDL();
    assert( "0 < output.indexOf(') compress;')" );
    assert( "output.indexOf('row store compress advanced') < 0" );

    // -- Feature: Oracle DOMAIN types (23ai+)
    output = new quicksql(`
# settings = {"db":"23ai"}
users
    email /domain email_d /nn
    phone /domain phone_d
`).getDDL();
    assert( "0 < output.indexOf('email_d not null')" );
    assert( "0 < output.indexOf('phone_d')" );
    assert( "output.indexOf('varchar2') < 0 || output.indexOf('varchar2') > output.indexOf('phone_d')" );

    // Domain directive ignored for db < 23
    output = new quicksql(`
# settings = {"db":"19c"}
users2
    email /domain email_d
`).getDDL();
    assert( "0 < output.indexOf('varchar2')" );
    assert( "0 < output.indexOf('email    varchar2')" );

    // -- Feature: SDO_GEOMETRY spatial type
    output = new quicksql(`
addresses
    street_name
    location geometry
`).getDDL();
    assert( "0 < output.indexOf('sdo_geometry')" );
    assert( "0 < output.indexOf('indextype is mdsys.spatial_index_v2')" );

    output = new quicksql(`
addresses2
    street_name
    geo sdo_geometry
`).getDDL();
    assert( "0 < output.indexOf('sdo_geometry')" );
    assert( "0 < output.indexOf('indextype is mdsys.spatial_index_v2')" );

    // -- Feature: JSON Relational Duality Views
    output = new quicksql(`
# settings = {"db":"23ai"}
departments
    name
    employees
        first_name
        last_name
        salary num

dv dept_emp_dv departments employees
`).getDDL();
    assert( "0 < output.indexOf('create or replace json relational duality view')" );
    assert( "0 < output.indexOf('dept_emp_dv')" );
    assert( "0 < output.indexOf('@insert @update @delete')" );
    assert( "0 < output.indexOf('[{')" );
    assert( "0 < output.indexOf('first_name')" );
    assert( "0 < output.indexOf('last_name')" );

}


small_tests();

console.log(assertionCnt);

// metatest that watches tests
const minimalTestCnt = 204;
if( assertionCnt < minimalTestCnt ) {
    console.error("assertionCnt < "+minimalTestCnt);
    throw new Error('Test failed');
} 
