import avro from 'avsc';

export default avro.Type.forSchema({
  type: 'record',
  fields: [
    {
      name: 'from', type: 'string'
    },
    {
      name: 'to', type: 'string'
    },
    {
      name: 'type', type: { type: 'enum', symbols: ['text', 'image', 'video'] }
    },
    {
      name: 'content', type: 'string'
    },
    {
      name: 'level', type: { type: 'enum', symbols: ['group', 'user'] }
    }
  ]
});
