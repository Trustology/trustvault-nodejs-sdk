type
  = type:(address / bool / bytes / int / string / tuple / uint) size:arrayType
  { return !size ? type : size[0] > 0 ? options.fixedArray(type, size[0]) : options.array(type); }

arrayType
  = fixedArray arrayType / array arrayType / ! fixedArray / ! array

address
  = "address" ([ \t\n\r]+ "payable")? { return options.address(); }

array
  = "[]" { return -1; }

bool
  = "bool" { return options.bool(); }

bytes
  = "bytes" size:[0-9]* { return size.join("") === "" ? options.bytes() : options.bytesBase(parseInt(size.join(""), 10))(); }

fixedArray
  = "[" size:[0-9]+ "]" { return parseInt(size.join(""), 10); }

int
  = "int" size:[0-9]* { return options.intBase(size.join("") === "" ? 256 : parseInt(size.join(""), 10))(); }

string
  = "string" { return options.string(); }

tuple
  = "(" type:(type ( "," type )*)? ")" { return options.tuple(type ? type.flat(2).filter((e, i) => i % 2 == 0) : []); }

uint
  = "uint" size:[0-9]* { return options.uintBase(size.join("") === "" ? 256 : parseInt(size.join(""), 10))(); }

identifier
  = i:([a-zA-Z$_] [a-zA-Z0-9$_]*) { return i.flat().join(""); }