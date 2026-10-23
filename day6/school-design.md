# School Database Design

## Students Table

The students table stores information about each student. It contains the student ID, name and email address. The student ID is the primary key, while the email is UNIQUE so that two students cannot use the same email address.

## Courses Table

The courses table stores information about the courses offered by the school. It contains a course ID and course name. The course ID is the primary key.

## Enrolments Table

The enrolments table records which students are taking which courses. It contains an enrolment ID, student ID, course ID and grade. The student ID and course ID are foreign keys that connect the enrolments table to the students and courses tables.

## Relationships

The relationship between students and enrolments is one-to-many because one student can have many enrolments, while each enrolment belongs to one student.

The relationship between courses and enrolments is also one-to-many because one course can have many enrolments, while each enrolment belongs to one course.

Students and courses have a many-to-many relationship because one student can take many courses and one course can have many students. A join table called enrolments is needed to represent this relationship. It also allows us to store additional information about the relationship, such as the student's grade.

## Index

I would add an index on `enrolments.student_id` because student IDs are frequently used when searching for the courses taken by a particular student. An index can make these searches faster, especially when the database becomes large.

For example:

```sql
CREATE INDEX idx_enrolments_student_id
ON enrolments(student_id);
```

## SQL or NoSQL?

I would choose SQL for this school system because the data is structured and has clear relationships between students, courses and enrolments. SQL databases provide primary keys, foreign keys, UNIQUE constraints and other rules that help maintain data accuracy. The system also requires queries that combine information from several tables, which SQL handles very well. A NoSQL database could be useful for flexible or unstructured data, but SQL is more suitable for this school enrolment system.
